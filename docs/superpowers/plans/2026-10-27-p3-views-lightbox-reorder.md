# P3：三视图（时间轴/瀑布流）+ 灯箱 + 拖拽排序 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 相册页在现有 3D 墙之外增加时间轴、瀑布流两种视图，支持灯箱浏览与拖拽排序，排序结果持久化并回写 3D 墙顺序。

**Architecture:** 视图层全部为无状态展示组件（TimelineView / MasonryView / SortableGridView / PhotoLightbox），数据与状态集中在 WallPage。排序通过 `reorderPhotos` 纯函数计算新 `sort_order`（0..n-1 连续）再逐行 UPDATE；数据库层补 photos UPDATE 策略与 `(album_id, sort_order)` 唯一约束，堵住并发上传的重复 sort_order。

**Tech Stack:** Vite + React 19 + TS strict + Tailwind 4 + @supabase/supabase-js + vitest（jsdom）。

**Spec:** `docs/superpowers/specs/2026-10-26-locket-design.md`（§7 页面结构 3、§8 P3 行）

## Global Constraints

- 每个用户只能读写自己名下的行（RLS owner 级，Spec §6 权限节）。
- 环境变量用 `VITE_` 前缀 + `import.meta.env` 读取。
- npm 安装一律 `npm install --maxsockets=4`（E 盘 exFAT 并发解压会丢文件）。
- 数据库 migration 通过 Supabase MCP `apply_migration` 应用，文件名 `supabase/migrations/NNNN_name.sql`。
- 测试文件顶部 `// @vitest-environment jsdom`；ResizeObserver / matchMedia 在 beforeAll 里 stub；mock `@/lib/supabase` 用 `vi.hoisted`。
- 提交直接进 main，Conventional Commits，中文正文。

## Review Focus

- 时间轴按 `created_at` 的 YYYY-MM 分组，跨月跨年（12 月与次年 1 月）不能混组、组序必须新→旧。
- 灯箱索引在切换视图/相册/删除照片后不得越界（显示空图或崩 JS）。
- 拖拽落点是自己时必须是 no-op，不产生无意义写库。
- 上传撞唯一约束（23505）只重试一次，避免死循环。
- 排序持久化后 3D 墙刷新顺序与数据库一致（WallPage 重载而非本地臆测）。

---

### Task 1: migration 0002 — photos UPDATE 策略 + sort_order 唯一约束

**Files:**
- Create: `supabase/migrations/0002_p3_reorder.sql`

**Interfaces:**
- Produces: 数据库具备 `photos_update` 策略（uploader 或 album owner 可 UPDATE）；`photos (album_id, sort_order)` 唯一索引；存量数据 sort_order 已按 (album_id, sort_order, created_at) 去重重排为 0..n-1。

- [ ] **Step 1: 写 migration SQL**

`supabase/migrations/0002_p3_reorder.sql`：

```sql
-- 存量去重：按相册内现有顺序重排为连续 0..n-1
with ranked as (
  select id,
         row_number() over (partition by album_id order by sort_order, created_at) - 1 as rn
  from photos
)
update photos set sort_order = ranked.rn from ranked where photos.id = ranked.id;

-- 并发上传/排序的兜底唯一性
create unique index if not exists photos_album_sort_order_uidx
  on photos (album_id, sort_order);

-- UPDATE 权限：照片 uploader 本人或相册 owner（对齐 DELETE 策略）
create policy "photos_update_uploader_or_owner"
on photos for update to authenticated
using (
  uploader_id = auth.uid()
  or exists (select 1 from albums where albums.id = photos.album_id and albums.owner_id = auth.uid())
)
with check (
  uploader_id = auth.uid()
  or exists (select 1 from albums where albums.id = photos.album_id and albums.owner_id = auth.uid())
);
```

- [ ] **Step 2: 应用并验证**

用 Supabase MCP `apply_migration` 应用；然后 `execute_sql` 查 `select policyname from pg_policies where tablename='photos'` 含 `photos_update_uploader_or_owner`，查 `pg_indexes` 含 `photos_album_sort_order_uidx`。
预期：两条查询各返回目标行。

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0002_p3_reorder.sql
git commit -m "feat(db): photos UPDATE 策略与 sort_order 唯一约束（P3 排序前置）"
```

### Task 2: sort_order 完整性 — reorderPhotos / persistSortOrder / 上传撞键重试

**Files:**
- Modify: `src/lib/photos.ts`
- Test: `src/lib/reorder.test.ts`（新建）；Modify: `src/lib/upload.test.ts`

**Interfaces:**
- Consumes: `Photo { id, album_id, uploader_id, storage_path, sort_order, created_at }`（`src/lib/types.ts`）。
- Produces:
  - `reorderPhotos<T extends { id: string }>(items: T[], fromIndex: number, toIndex: number): T[]` — 纯函数；把 fromIndex 元素移到 toIndex，返回新数组（不改动原数组），每个元素按新位置带连续 `sort_order: 0..n-1`（用 `{...item, sort_order}` 展开，T 需含 sort_order 时由调用方断言）。fromIndex === toIndex 或索引越界时原样返回。
  - `persistSortOrder(updates: { id: string; sort_order: number }[]): Promise<void>` — 逐个 `supabase.from('photos').update({ sort_order }).eq('id', id)`，任何一条失败即 throw。

- [ ] **Step 1: 写失败测试**

`src/lib/reorder.test.ts`（mock `@/lib/supabase`，`vi.hoisted`）：
- `reorderPhotos 把首元素移到第三位，其余保持相对顺序且 sort_order 连续`
  items = [{id:'a',sort_order:0},{id:'b',sort_order:1},{id:'c',sort_order:2},{id:'d',sort_order:3}]，reorderPhotos(items, 0, 2) → ids ['b','c','a','d']，sort_order 依次 0,1,2,3，原数组未被修改。
- `reorderPhotos 索引相同或越界时原样返回`。
- `persistSortOrder 对每条调用 update 并传 sort_order`：mock `from` 链，断言调用次数与参数。

`src/lib/upload.test.ts` 追加：
- `插入撞唯一约束(23505)时重算 nextSortOrder 重试一次并成功`：让 insert mock 第一次 reject/resolve error `{code:'23505'}`，第二次成功，断言最终 results 长度 1 且 insert 被调 2 次。
- `重试仍失败则计入 failures 不中断其他文件`（沿用现有 failures 结构）。

- [ ] **Step 2: 跑测试确认失败**

Run: `npx vitest run src/lib/reorder.test.ts src/lib/upload.test.ts`
预期：reorderPhotos / persistSortOrder not exported 报错；重试用例失败。

- [ ] **Step 3: 实现**

`src/lib/photos.ts` 追加 `reorderPhotos`（splice 重排 + map 赋连续 sort_order）与 `persistSortOrder`（for 循环 update）。
`src/lib/upload.ts`：写行处捕获 error.code === '23505' 时以最新 `nextSortOrder` 重算重试一次，再失败记入 failures（单张失败不中断既有行为不变）。

- [ ] **Step 4: 跑测试确认通过 + 全量回归**

Run: `npx vitest run`
预期：全绿（执行时总数 = 现有 47 + 新增）。

- [ ] **Step 5: Commit**

```bash
git add src/lib/photos.ts src/lib/reorder.test.ts src/lib/upload.ts src/lib/upload.test.ts
git commit -m "feat(wall): 排序重排纯函数、持久化与上传唯一约束重试"
```

### Task 3: 时间轴与瀑布流视图组件

**Files:**
- Create: `src/components/wall/TimelineView.tsx`；Test: `src/components/wall/TimelineView.test.tsx`
- Create: `src/components/wall/MasonryView.tsx`；Test: `src/components/wall/MasonryView.test.tsx`

**Interfaces:**
- Consumes: `PhotoWithUrl`（`src/lib/types.ts`，含 `url`）。
- Produces:
  - `TimelineView: (props: { photos: PhotoWithUrl[]; onOpen(index: number): void }) => JSX` — 按 `created_at.slice(0,7)` 分组成 YYYY-MM 区块，组内与组序均按 `created_at` 新→旧；每组团块头部显示 `YYYY 年 M 月`，主体 `grid grid-cols-3 sm:grid-cols-4 gap-2`；点缩略图调 `onOpen(该视图扁平数组中的下标)`（扁平顺序 = 分组展开顺序）。空数组渲染 `暂无照片`。
  - `MasonryView: (props: { photos: PhotoWithUrl[]; onOpen(index: number): void }) => JSX` — 纯 CSS columns：`columns-2 md:columns-3 xl:columns-4 gap-3`，每项 `mb-3 break-inside-avoid rounded-xl overflow-hidden cursor-zoom-in`；显示顺序 = `photos` 传入顺序（即 sort_order 顺序）；点图调 `onOpen(i)`。空数组渲染 `暂无照片`。

- [ ] **Step 1: 写失败测试**

TimelineView.test：
- 3 张照片分属 2025-10×2、2024-03 → 渲染 2 个组头，且 `2025 年 10 月` 在 `2024 年 3 月` 之前。
- 点击第 2 张缩略图 → `onOpen` 以分组展开后的正确下标被调用（断言具体数字）。

MasonryView.test：
- 传入 3 张 → 3 个 `img` 可见；点击第 3 张 → `onOpen(2)`。

- [ ] **Step 2: 跑测试确认失败**

Run: `npx vitest run src/components/wall`
预期：组件不存在导入报错。

- [ ] **Step 3: 实现两组件**

按 Interfaces 签名；图片 `loading="lazy" draggable={false}`；组头 `text-sm text-white/60`；整体文字白色系（页面深色背景）。

- [ ] **Step 4: 跑测试确认通过**

Run: `npx vitest run src/components/wall`
预期：全 pass。

- [ ] **Step 5: Commit**

```bash
git add src/components/wall/
git commit -m "feat(wall): 时间轴与瀑布流视图组件"
```

### Task 4: 灯箱 PhotoLightbox

**Files:**
- Create: `src/components/wall/PhotoLightbox.tsx`；Test: `src/components/wall/PhotoLightbox.test.tsx`

**Interfaces:**
- Consumes: 仅展示用最小结构 `{ id: string; url: string }[]`。
- Produces:
  - `PhotoLightbox: (props: { photos: { id: string; url: string }[]; index: number; onIndexChange(next: number): void; onClose(): void }) => JSX`
  - 全屏 `fixed inset-0 z-50 bg-black/90`；中央显示当前图（`max-h-[80vh] max-w-[90vw] object-contain`）；底部计数 `index+1 / photos.length`；左右圆形按钮 `‹` `›`（下标环回 wrap）；点遮罩空白处 `onClose`，点图本身不关闭；`useEffect` 监听 `keydown`：ArrowLeft/ArrowRight wrap 切换、Escape `onClose`；渲染时 `photos[index]` 为空（越界保护）则渲染 null。

- [ ] **Step 1: 写失败测试**

- 渲染当前 `photos[index].url` 与计数 `2 / 3`。
- 点 `›` 在末张时回到第 1 张（wrap）；点 `‹` 在第 1 张时去末张。
- 按 Escape → `onClose` 被调；按 ArrowRight → `onIndexChange(1)`。
- index 越界（≥ length）渲染 null 不崩。

- [ ] **Step 2: 跑测试确认失败**

Run: `npx vitest run src/components/wall/PhotoLightbox.test.tsx`
预期：导入报错。

- [ ] **Step 3: 实现组件**

按签名；监听挂在 `window` keydown，`useEffect` 依赖 index/photos.length 读最新值（或用 ref 避免重复绑定）。

- [ ] **Step 4: 跑测试确认通过**

Run: `npx vitest run src/components/wall/PhotoLightbox.test.tsx`
预期：pass。

- [ ] **Step 5: Commit**

```bash
git add src/components/wall/PhotoLightbox.tsx src/components/wall/PhotoLightbox.test.tsx
git commit -m "feat(wall): 照片灯箱组件（键盘/按钮导航，越界保护）"
```

### Task 5: WallPage 接线 — 视图切换、灯箱、排序模式

**Files:**
- Modify: `src/pages/WallPage.tsx`
- Create: `src/components/wall/SortableGridView.tsx`；Test: `src/components/wall/SortableGridView.test.tsx`
- Modify: `src/pages/WallPage.test.tsx`

**Interfaces:**
- Consumes: Task 2 `reorderPhotos` / `persistSortOrder`；Task 3 `TimelineView` / `MasonryView`；Task 4 `PhotoLightbox`。
- Produces:
  - `SortableGridView: (props: { photos: PhotoWithUrl[]; onReorder(fromIndex: number, toIndex: number): void }) => JSX` — `grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2`；每项 `data-testid="sortable-item"` `data-index={i}` `draggable`；`onDragStart` 记录 dataTransfer `text/plain = String(i)`；容器 `onDragOver` preventDefault；项 `onDrop` 读出 from 调 `onReorder(from, i)`。
  - WallPage 新增状态：`viewMode: 'wall'|'timeline'|'masonry'`（默认 `'wall'`）、`sortMode: boolean`、`lightbox: { photos: {id,url}[]; index: number } | null`。
  - `handleReorder(from, to)`：from===to 直接 return；`reorderPhotos(photos, from, to)` → `persistSortOrder(重排结果)` → `await load()` 刷新（含 wallItems）；catch 置 `setError`。

- [ ] **Step 1: 写失败测试**

SortableGridView.test：
- 对 `data-index="0"` 项 `fireEvent.dragStart`（dataTransfer `{setData: vi.fn(), getData: () => '0'}`）、对 `data-index="2"` 项 `fireEvent.drop`（getData 返回 `'0'`）→ `onReorder(0, 2)`。

WallPage.test 追加（沿用现有 createMemoryRouter 桩）：
- 相册页头部出现 `3D 墙 / 时间轴 / 瀑布流` 三个切换按钮。
- 点 `时间轴` 后渲染 `TimelineView`（出现组头文本）；点 `瀑布流` 渲染 `MasonryView`。
- 点排序按钮后渲染 `sortable-item` 网格；触发 drop → mock 的 update 被调用（mock `@/lib/supabase` 与 `listPhotosWithUrls`，参照现有 WallPage.test 的 mock 方式）。
- 灯箱：点瀑布流某图 → 出现 `fixed` 遮罩与计数；按 Escape 关闭。

- [ ] **Step 2: 跑测试确认失败**

Run: `npx vitest run src/pages/WallPage.test.tsx src/components/wall/SortableGridView.test.tsx`
预期：新断言失败。

- [ ] **Step 3: 实现**

- 头部（现有右上区域）加视图切换分段按钮与 `排序` 开关按钮（`排序` 仅时间轴/瀑布流下可用，3D 墙下隐藏）；`sortMode` 开启时两视图替换为 `SortableGridView`。
- 灯箱：`lightbox` 状态在 WallPage 根部渲染 `<PhotoLightbox>`（条件非 null）；视图回调 `setLightbox({ photos: 该视图展示数组映射 {id,url}, index })`；`onIndexChange` 更新 index；`albumId` 变化时 `setLightbox(null)`。
- 展示数组约定：wall → wallItems（ FakePhoto，不需要灯箱）；timeline → 按 TimelineView 分组展开序预先计算的同序数组；masonry → photos 原序。WallPage 计算 `timelinePhotos`（与 TimelineView 同序）传给两者，保证灯箱下标一致。

- [ ] **Step 4: 跑测试确认通过 + 全量回归 + 构建**

Run: `npx vitest run && npm run build`
预期：全绿、构建通过。

- [ ] **Step 5: Commit**

```bash
git add src/pages/WallPage.tsx src/pages/WallPage.test.tsx src/components/wall/SortableGridView.tsx src/components/wall/SortableGridView.test.tsx
git commit -m "feat(wall): 相册页三视图切换、灯箱与拖拽排序持久化"
```

### Task 6: 复审与收尾

- [ ] **Step 1: 派全新 coder 子代理整体复审本阶段全部 diff**

提示词要点：对照本计划 + spec §7.3/§8 P3 行；重点看 Review Focus 五条；不修改代码只出结论。

- [ ] **Step 2: 处理复审意见（有 Major 必修）后最终提交推送**

```bash
git push origin main
```

- [ ] **Step 3: 给用户 P3 验收清单**

三视图切换流畅 / 时间轴分组正确 / 灯箱键盘可用 / 排序后刷新墙顺序一致 / 手机触屏下 HTML5 DnD 不可用时至少不崩（降级为不可拖，不报错阻断）。
