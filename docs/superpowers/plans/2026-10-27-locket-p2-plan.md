# Locket P2 实现计划：Supabase 账户体系 + 相册 CRUD + 照片上传

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 接上 Supabase：邮箱+密码注册登录，用户拥有自己的相册（自建/重命名/删除），相册内上传（浏览器压缩→私有桶直传）、列表、删除照片，3D 墙改吃真实数据。

**Architecture:** 纯前端 SPA + Supabase（Auth + Postgres + 私有 Storage）。所有数据访问经 `@supabase/supabase-js` 走 anon key，权限由 RLS 兜死。P2 的 RLS 只有 owner 级策略；关注/协作策略在 P5 扩展。认证态由 supabase-js 持久化在 localStorage，路由守卫读会话。

**Tech Stack:** 既有 Vite+React19+TS(strict)+Tailwind4 + @supabase/supabase-js + react-router-dom + browser-image-compression。

**Spec:** `docs/superpowers/specs/2026-10-26-locket-design.md`（§2 目标 2/3/5/7，§6 数据模型与 RLS，§8 P2）

## Global Constraints

- npm 一律 `--maxsockets=4`（E 盘 exFAT 解压损坏教训，P1 已立法）。
- TypeScript strict；每 Task 结束 `git commit`（Conventional Commits，中文摘要）。
- 环境变量只用 `VITE_` 前缀 + `import.meta.env` 读取（Vite 规范）；`.env` 已 gitignore，`.env.example` 提交模板。
- 不提交 service_role key；它永远不进仓库。
- shadcn/ui 组件可用（本计划 Task 1 补主题令牌）。
- 动效尊重 `prefers-reduced-motion`（沿用 P1 约定）。
- 数据库结构变更只通过 `supabase/migrations/` 下的 SQL 文件，由用户粘贴到 Supabase Dashboard SQL Editor 执行（本机无 Docker，不跑 CLI）。

## Review Focus

1. **未登录访问任何受保护路由 → 重定向到 /login**——Task 4 的守卫测试钉住。
2. **A 登录后看不到 B 的相册/照片**（RLS 生效）——SQL 验收清单用户执行（两个浏览器/无痕窗口）。
3. **上传 10MB+ 大图**：压缩后 ≤ 几百 KB；HEIC/异常文件失败时该张报错、其余继续——Task 6 测试钉压缩参数与单张失败不中断队列。
4. **删除相册后无残留**：先删 storage 对象再删行（行级 cascade 只清表）——Task 5/7 代码评审点 + 用户验收。
5. **重复点击上传/保存产生重复请求**——按钮 pending 态禁用，Task 5/6 测试钉住。

---

### Task 1: 补 shadcn 主题令牌（P1 遗留）

**Files:**
- Modify: `src/index.css`

**Interfaces:**
- Produces: index.css 含 `@theme inline` 的 shadcn CSS 变量（radius、sidebar 色板），`@import "tailwindcss";` 保持第一行。

- [ ] **Step 1: 改写 index.css**——保留 `@import "tailwindcss";`，加入 shadcn 官方 Vite+Tailwind4 安装文档的主题变量块（neutral 基色、css variables 模式，与 components.json 的 baseColor/cssVariables 一致）。

- [ ] **Step 2: 验证**

Run: `npm run build`
Expected: exit 0。

- [ ] **Step 3: Commit**

```bash
git add src/index.css
git commit -m "fix(theme): 补 shadcn 主题 CSS 变量（P1 遗留）"
```

---

### Task 2: Supabase 客户端与环境变量

**Files:**
- Create: `.env`、`.env.example`、`src/lib/supabase.ts`、`src/lib/types.ts`
- Modify: `tsconfig.app.json`（types 加 vite/client 已有则跳过）

**Interfaces:**
- Produces:
  ```ts
  // types.ts
  export interface Album { id: string; owner_id: string; name: string; allow_collab_upload: boolean; created_at: string }
  export interface Photo { id: string; album_id: string; uploader_id: string; storage_path: string; sort_order: number; created_at: string }
  export interface PhotoWithUrl extends Photo { url: string }
  // supabase.ts
  export const supabase: SupabaseClient   // 用 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY 创建
  ```

- [ ] **Step 1: 写 `.env`**（gitignored，不入库）与 `.env.example`（占位符，入库）：
  ```
  VITE_SUPABASE_URL=https://your-project.supabase.co
  VITE_SUPABASE_ANON_KEY=your-anon-key
  ```

- [ ] **Step 2: 实现 `src/lib/supabase.ts`**（createClient + env 缺失时抛明确错误）与 `src/lib/types.ts`。

- [ ] **Step 3: 验证**

Run: `npm run build`
Expected: exit 0（import.meta.env 类型由 vite/client 提供）。

- [ ] **Step 4: Commit**

```bash
git add .env.example src/lib/supabase.ts src/lib/types.ts
git commit -m "feat(supabase): 客户端与环境变量接入"
```

---

### Task 3: 数据库迁移（SQL 文件 + 用户执行）

**Files:**
- Create: `supabase/migrations/0001_init.sql`

**Interfaces:**
- Produces: `albums`、`photos` 两表（字段与 spec §6 一致），owner 级 RLS 策略，私有桶 `photos` + storage 路径首段=owner_id 的四条策略。**P5 会在此文件基础上扩展关注者策略。**

- [ ] **Step 1: 写 `supabase/migrations/0001_init.sql`**——内容要点：
  - `albums(id uuid pk default gen_random_uuid(), owner_id uuid references auth.users on delete cascade, name text check 1..50 字, allow_collab_upload bool default false, created_at)`
  - `photos(id, album_id references albums on delete cascade, uploader_id references auth.users on delete cascade, storage_path text, sort_order int default 0, created_at)` + `(album_id, sort_order)` 索引
  - 两表 `enable row level security`；photos 的 select/insert/delete 策略用 `(select owner_id from albums where id = album_id)` 归属判定；delete 允许 uploader 或 album owner（为 P5 协作上传预留语义）
  - `insert into storage.buckets (id, name, public) values ('photos','photos',false)`
  - storage.objects 四条策略：`auth.uid()::text = (storage.foldername(name))[1]`（路径首段=owner_id）

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/0001_init.sql
git commit -m "feat(db): 初始表结构与 owner 级 RLS（相册/照片/私有桶）"
```

- [ ] **Step 3: 用户执行清单（执行计划时在此停下等用户）**
  1. Dashboard → SQL Editor → 粘贴 `0001_init.sql` → Run
  2. Dashboard → Authentication → Sign In / Providers → 关闭 **Confirm email**
  3. 验收 SQL（Editor 执行，预期都返回 0 行）：
     ```sql
     select * from albums;                       -- RLS 生效则只看到自己（新库为空）
     select policyname from pg_policies where schemaname='public';  -- 7 条策略
     ```

---

### Task 4: 路由 + 认证（登录/注册/守卫）

**Files:**
- Create: `src/components/auth/RequireAuth.tsx`、`src/pages/LoginPage.tsx`、`src/pages/AlbumsPage.tsx`（占位）、`src/pages/WallPage.tsx`（占位，先复用假数据墙）
- Modify: `src/App.tsx`（路由）、`package.json`（react-router-dom）
- Test: `src/pages/LoginPage.test.tsx`、`src/components/auth/RequireAuth.test.tsx`

**Interfaces:**
- Consumes: Task 2 的 `supabase`。
- Produces:
  ```ts
  export function RequireAuth({ children }: { children: ReactNode }): JSX.Element  // 无会话 → <Navigate to="/login" replace />
  ```
  路由表：`/login`、`/`（相册列表，RequireAuth）、`/album/:albumId`（墙，RequireAuth）。

- [ ] **Step 1: 写失败测试**——`LoginPage.test.tsx`（vi.mock('@/lib/supabase')：填合法邮箱+密码点登录 → 调用 signInWithPassword 一次并 navigate；空邮箱 → 报错不调用）与 `RequireAuth.test.tsx`（无会话渲染 → 出现跳转到 /login；有会话 → 渲染 children）。jsdom 下 ResizeObserver/matchMedia 桩沿用 P1 模式。

- [ ] **Step 2: 跑测试确认失败**（模块不存在）。

- [ ] **Step 3: 装 react-router-dom；实现路由、RequireAuth、LoginPage**（邮箱+密码，登录/注册双模式切换）、两个占位页（AlbumsPage 显示「我的相册」空壳，WallPage 暂用 `makeFakePhotos(12)` 保持 P1 可玩）。

- [ ] **Step 4: 跑测试确认通过 + build。**

- [ ] **Step 5: Commit**

```bash
git add -A src package.json package-lock.json
git commit -m "feat(auth): 路由、登录/注册与守卫"
```

---

### Task 5: 相册 CRUD（我的相册列表页）

**Files:**
- Create: `src/lib/albums.ts`、`src/pages/AlbumsPage.tsx`、`src/components/albums/AlbumDialog.tsx`
- Test: `src/lib/albums.test.ts`、`src/pages/AlbumsPage.test.tsx`

**Interfaces:**
- Consumes: Task 2 `supabase`、Task 4 路由。
- Produces:
  ```ts
  export async function listAlbums(): Promise<Album[]>
  export async function createAlbum(name: string): Promise<Album>      // trim 后 1..50 字，否则抛 ValidationError
  export async function renameAlbum(id: string, name: string): Promise<void>
  export async function deleteAlbum(album: Album): Promise<void>      // 先删 photos 行的 storage 对象，再删相册行
  export function validateAlbumName(name: string): string              // 纯函数：返回 trim 后名称，非法抛错（测试钉）
  ```

- [ ] **Step 1: 写失败测试**——`validateAlbumName`（空白/超50字/正常 trim）；`createAlbum` 先校验后调用 supabase（mock）；`AlbumsPage` 渲染列表 + 新建弹窗打开/关闭；删除按钮在 pending 时禁用。

- [ ] **Step 2: 跑测试确认失败。**

- [ ] **Step 3: 实现。** `deleteAlbum` 顺序：list storage_path → storage.remove(paths) → delete album 行（cascade 清 photos 表）。

- [ ] **Step 4: 跑测试 + build 通过。**

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(albums): 相册列表与增删改"
```

---

### Task 6: 照片上传管线（压缩 → 私有桶 → 写行）

**Files:**
- Create: `src/lib/upload.ts`、`src/components/wall/UploadButton.tsx`
- Modify: `src/pages/WallPage.tsx`（接相册数据 + 上传入口）
- Test: `src/lib/upload.test.ts`

**Interfaces:**
- Consumes: Task 2 `supabase`、Task 5 相册。
- Produces:
  ```ts
  export interface UploadResult { photo: Photo; fileName: string }
  export interface UploadFailure { fileName: string; error: string }
  export async function uploadPhotos(albumId: string, ownerId: string, files: File[]): Promise<{ results: UploadResult[]; failures: UploadFailure[] }>
  // 内部：browser-image-compression（maxWidthOrHeight 2048、maxSizeMB 0.3、useWebWorker、fileType image/webp）
  // → storage.upload(`${ownerId}/${albumId}/${crypto.randomUUID()}.webp`, blob) → insert photos 行（sort_order = 当前 max+1 递增）
  // 单张失败进 failures，不中断队列
  ```

- [ ] **Step 1: 写失败测试**（mock supabase 与压缩库）：正常流程调用顺序（compress → upload → insert）；单张 insert 抛错 → 该张入 failures、另一张仍成功；`nextSortOrder` 纯函数（空相册=0，已有 n 张=n）。

- [ ] **Step 2: 跑测试确认失败。**

- [ ] **Step 3: 实现 `upload.ts` 与 UploadButton**（多选 input、pending 时禁用、逐张进度/结果提示）。

- [ ] **Step 4: 跑测试 + build 通过。**

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(upload): 照片压缩直传管线"
```

---

### Task 7: 相册墙接真实数据 + 照片删除

**Files:**
- Create: `src/lib/photos.ts`
- Modify: `src/pages/WallPage.tsx`（真实 photos → 签名 URL → PhotoWall）、`src/components/PhotoWallCard.tsx`（长按/右键删除入口，owner 可见）
- Test: `src/lib/photos.test.ts`

**Interfaces:**
- Consumes: Task 2/5/6。
- Produces:
  ```ts
  export async function listPhotosWithUrls(albumId: string): Promise<PhotoWithUrl[]>   // createSignedUrls 批量签 7 天，按 sort_order, created_at 排序
  export async function deletePhoto(photo: Photo): Promise<void>                       // 先 storage.remove 再 delete 行
  ```

- [ ] **Step 1: 写失败测试**（mock supabase）：`listPhotosWithUrls` 把 storage_path 映射为签名 URL 并排序；`deletePhoto` 先删对象后删行、顺序断言。

- [ ] **Step 2: 跑测试确认失败。**

- [ ] **Step 3: 实现。** WallPage：加载相册照片 → 映射为 `FakePhoto` 形状（`{id, src:url, caption}`）喂给既有 PhotoWall（不改 P1 组件接口）；删除走长按（1.2s）或右键菜单，仅 uploader/owner 可见；删除后本地移除并提示。

- [ ] **Step 4: 跑测试 + build 通过。**

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(wall): 相册墙接真实照片与删除"
```

---

## 用户验收清单（P2 全部 Task 完成后执行）

- [ ] 注册两个账号（普通窗口 + 无痕窗口）互不可见对方相册（Review Focus #2）
- [ ] 手机浏览器实际上传 3 张照片（含 1 张 >5MB 大图），墙正确显示
- [ ] 删除一张照片 → 墙刷新消失；删除整个相册 → 再建同名相册不冲突
- [ ] 未登录直接访问 `/` 被弹去登录页
- [ ] DevTools Network 里 img 请求是 `/storage/v1/object/sign/...`（签名 URL），不是 public URL

## Self-Review 记录

1. **Spec 覆盖**：P2 对应 spec §8 的 P2（Auth+相册 CRUD+上传/列表/删除）——Task 3/4/5/6/7 覆盖；RLS 取 owner 级子集（P5 扩展）已在 Task 3 注明。§2 目标 4/6/8/9/11（视图/关注/导出/心形/回顾）属 P3-P7，不在本计划。
2. **Step 扫描**：DB/网络层无法离线 TDD 的部分（真实上传、RLS 行为）显式归入用户验收清单；可纯函数化/可 mock 的部分（校验、顺序、删除次序、守卫、pending 态）均有先失败后通过的测试。
3. **类型一致**：`PhotoWithUrl extends Photo`、`uploadPhotos` 出入参与 spec §6 字段一致；`validateAlbumName`/`nextSortOrder` 为纯函数，前后任务引用同名。
4. **Review Focus**：5 条映射——#1→Task 4 测试；#2→Task 3 SQL 验收；#3→Task 6 测试+验收；#4→Task 5/7 删除次序测试+验收；#5→Task 5/6 pending 态测试。
5. **比例**：实现只给签名与关键约束，测试给名称与断言点，命令与 SQL 给全文（SQL 属于「规格固定的精确副本」）。
