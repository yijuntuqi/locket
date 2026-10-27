# Locket P2 实现计划 v2：Supabase 账户体系 + 相册 CRUD + 照片上传 + Realtime 通知

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 接上 Supabase：邮箱+密码注册登录（留好邮件确认的状态口子），用户拥有自己的相册（自建/重命名/删除），相册内上传（浏览器压缩→私有桶直传）、列表、删除照片，3D 墙改吃真实数据；同一用户的其他设备通过 Realtime 收到「有新的回忆更新啦」Toast。

**Architecture:** 纯前端 SPA + Supabase（Auth + Postgres + 私有 Storage + Realtime Broadcast）。所有数据访问经 `@supabase/supabase-js` 走 anon key，行级与文件级权限由 RLS 兜死（任何用户只能读写自己名下的行和文件）。P2 的可见性 RLS 只有 owner 级；关注/协作策略在 P5 扩展（Realtime 频道授权同步扩展）。数据库变更通过 Supabase MCP `apply_migration` 执行并留存 SQL 于 `supabase/migrations/`。

**Tech Stack:** 既有 Vite+React19+TS(strict)+Tailwind4 + @supabase/supabase-js + react-router-dom + browser-image-compression + sonner（Toast）。

**Spec:** `docs/superpowers/specs/2026-10-26-locket-design.md`（§2 目标 2/3/5/7，§6 数据模型与 RLS，§8 P2）

## Global Constraints

- npm 一律 `--maxsockets=4`（E 盘 exFAT 解压损坏教训，P1 已立法）。
- TypeScript strict；每 Task 结束 `git commit`（Conventional Commits，中文摘要）。
- 环境变量只用 `VITE_` 前缀 + `import.meta.env` 读取；`.env` 已 gitignore，`.env.example` 提交模板。
- 不提交 service_role key；它永远不进仓库。
- shadcn/ui 组件可用（Task 1 补主题令牌）。
- 动效尊重 `prefers-reduced-motion`（沿用 P1 约定）。
- 数据库结构变更：SQL 先写入 `supabase/migrations/` 入 git，再经 Supabase MCP `apply_migration` 应用到项目（用户已授权）。
- Realtime 频道 `user:{uid}` 为**私有频道**：授权策略 P2 仅本人可收发；P5 扩展为「本人 + accepted 关注者」时跨用户通知自动生效。

## Review Focus

1. **未登录访问任何受保护路由 → 重定向到 /login**——Task 4 的守卫测试钉住。
2. **A 登录后看不到 B 的相册/照片/Storage 文件**（行级 + 文件级 RLS 都生效）——Task 3 由我跑验收 SQL + 用户双账号实测。
3. **上传 10MB+ 大图**：压缩后 ≤ 几百 KB；单张失败该张报错、其余继续——Task 6 测试钉住。
4. **删除相册后无残留**：先删 storage 对象再删行——Task 5/7 删除次序测试钉住。
5. **重复点击上传/保存产生重复请求**——按钮 pending 态禁用，Task 5/6 测试钉住。
6. **Realtime 不越权**：B 收不到 A 频道的广播（realtime.messages 策略兜死）——Task 3 SQL 验收 + Task 8 代码只在 owner 频道收发。

---

### Task 1: 补 shadcn 主题令牌（P1 遗留）

**Files:**
- Modify: `src/index.css`

**Interfaces:**
- Produces: index.css 含 `@theme inline` 的 shadcn CSS 变量（neutral 基色、css variables 模式，与 components.json 一致），`@import "tailwindcss";` 保持第一行。

- [ ] **Step 1: 改写 index.css**——保留 `@import "tailwindcss";`，加入 shadcn 官方 Vite+Tailwind4 主题变量块。
- [ ] **Step 2: 验证**

Run: `npm run build`
Expected: exit 0。

- [ ] **Step 3: Commit**（`fix(theme): 补 shadcn 主题 CSS 变量（P1 遗留）`）

---

### Task 2: Supabase 客户端与环境变量

**Files:**
- Create: `.env`、`.env.example`、`src/lib/supabase.ts`、`src/lib/types.ts`

**Interfaces:**
- Produces:
  ```ts
  // types.ts
  export interface Album { id: string; owner_id: string; name: string; allow_collab_upload: boolean; created_at: string }
  export interface Photo { id: string; album_id: string; uploader_id: string; storage_path: string; sort_order: number; created_at: string }
  export interface PhotoWithUrl extends Photo { url: string }
  // supabase.ts
  export const supabase: SupabaseClient   // VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY，缺失时抛明确错误
  ```

- [ ] **Step 1: 写 `.env`**（用用户提供的 URL 与 anon key，不入库）与 `.env.example`（占位符，入库）。
- [ ] **Step 2: 实现 supabase.ts 与 types.ts。**
- [ ] **Step 3: 验证**

Run: `npm run build`
Expected: exit 0。

- [ ] **Step 4: Commit**（`feat(supabase): 客户端与环境变量接入`）

---

### Task 3: 数据库迁移（MCP 执行 + Realtime 授权）

**Files:**
- Create: `supabase/migrations/0001_init.sql`

**Interfaces:**
- Produces: `albums`、`photos` 两表 + owner 级 RLS + 私有桶 `photos`（路径首段=owner_id 四条策略）+ `realtime.messages` 两条策略（频道 `user:{uid}` 仅本人收发）。**P5 在此扩展关注者策略。**

- [ ] **Step 1: 写 `supabase/migrations/0001_init.sql`**——要点：
  - `albums(id uuid pk default gen_random_uuid(), owner_id uuid references auth.users on delete cascade, name text check 1..50 字, allow_collab_upload bool default false, created_at)`
  - `photos(id, album_id references albums on delete cascade, uploader_id references auth.users on delete cascade, storage_path text, sort_order int default 0, created_at)` + `(album_id, sort_order)` 索引
  - 两表 enable RLS；photos 策略用 `(select owner_id from albums where id = album_id)` 归属判定；delete 允许 uploader 或 album owner（为 P5 协作预留）
  - `insert into storage.buckets (id, name, public) values ('photos','photos', false)`
  - storage.objects 四条策略：`auth.uid()::text = (storage.foldername(name))[1]`
  - realtime.messages（官方 Authorization 文档模式，已核对）：
    ```sql
    create policy "owner receive own album events" on "realtime"."messages"
      for select to authenticated using ((select realtime.topic()) = 'user:' || (select auth.uid()::text));
    create policy "owner send own album events" on "realtime"."messages"
      for insert to authenticated with check ((select realtime.topic()) = 'user:' || (select auth.uid()::text));
    ```

- [ ] **Step 2: Commit SQL 文件**（`feat(db): 初始表结构与 owner 级 RLS（相册/照片/私有桶/Realtime 授权）`）

- [ ] **Step 3: 通过 Supabase MCP `apply_migration` 应用到项目**（project_id `ckacwqpqhqqthziwrxge`）。

- [ ] **Step 4: 我执行验收 SQL**：`pg_policies` 计数（public 7 条 + realtime 2 条）、`list_tables` 确认两表、`storage.buckets` 确认 photos 为 non-public。

- [ ] **Step 5: 用户动作（只剩两件）**
  1. Dashboard → Authentication → Sign In / Providers → 关闭 **Confirm email**
  2. Dashboard → Realtime → Settings → 关闭 **Allow public access**（私有频道生效前提）

---

### Task 4: 路由 + 认证（含邮件确认状态口子）

**Files:**
- Create: `src/components/auth/RequireAuth.tsx`、`src/pages/LoginPage.tsx`、`src/pages/AlbumsPage.tsx`（占位）、`src/pages/WallPage.tsx`（占位，暂用假数据墙）
- Modify: `src/App.tsx`、`package.json`（react-router-dom）
- Test: `src/pages/LoginPage.test.tsx`、`src/components/auth/RequireAuth.test.tsx`

**Interfaces:**
- Consumes: Task 2 `supabase`。
- Produces:
  ```ts
  export function RequireAuth({ children }: { children: ReactNode }): JSX.Element
  // signUp 双态（口子）：
  // data.session 存在 → 视为已登录进 /
  // data.session 为 null（后台开启 Confirm email 后）→ 渲染「注册成功，请查收确认邮件激活」界面，代码无需再改
  ```
  路由表：`/login`、`/`（RequireAuth）、`/album/:albumId`（RequireAuth）。

- [ ] **Step 1: 写失败测试**——LoginPage（mock `@/lib/supabase`）：合法邮箱+密码点登录 → 调 `signInWithPassword` 一次；注册模式 signUp 返回 `session: null` → 出现确认邮件提示、不跳转；返回 `session` → 跳转 `/`。RequireAuth：无会话 → 重定向 `/login`；有会话 → 渲染 children。

- [ ] **Step 2: 跑测试确认失败。**
- [ ] **Step 3: 装 react-router-dom；实现路由、RequireAuth、LoginPage（登录/注册双模式）、两个占位页。**
- [ ] **Step 4: 测试通过 + build 通过。**
- [ ] **Step 5: Commit**（`feat(auth): 路由、登录/注册与守卫（含邮件确认状态）`）

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
  export async function createAlbum(name: string): Promise<Album>
  export async function renameAlbum(id: string, name: string): Promise<void>
  export async function deleteAlbum(album: Album): Promise<void>   // 先删 photos 行对应的 storage 对象，再删相册行
  export function validateAlbumName(name: string): string           // trim 后 1..50 字，非法抛错
  ```

- [ ] **Step 1: 写失败测试**——`validateAlbumName`（空白/超 50 字/正常 trim）；`createAlbum` 先校验后调 supabase（mock）；AlbumsPage 渲染列表、新建弹窗、删除按钮 pending 禁用。
- [ ] **Step 2: 跑测试确认失败。**
- [ ] **Step 3: 实现。** `deleteAlbum` 顺序：查 photos.storage_path → `storage.remove(paths)` → 删 album 行（cascade 清 photos 表）。
- [ ] **Step 4: 测试 + build 通过。**
- [ ] **Step 5: Commit**（`feat(albums): 相册列表与增删改`）

---

### Task 6: 照片上传管线（压缩 → 私有桶 → 写行）

**Files:**
- Create: `src/lib/upload.ts`、`src/components/wall/UploadButton.tsx`
- Modify: `src/pages/WallPage.tsx`
- Test: `src/lib/upload.test.ts`

**Interfaces:**
- Consumes: Task 2/5。
- Produces:
  ```ts
  export interface UploadResult { photo: Photo; fileName: string }
  export interface UploadFailure { fileName: string; error: string }
  export async function uploadPhotos(albumId: string, ownerId: string, files: File[]): Promise<{ results: UploadResult[]; failures: UploadFailure[] }>
  // 内部：browser-image-compression（maxWidthOrHeight 2048、maxSizeMB 0.3、useWebWorker、fileType image/webp）
  // → storage.upload(`${ownerId}/${albumId}/${crypto.randomUUID()}.webp`, blob) → insert photos 行（sort_order = max+1 递增）
  // 单张失败进 failures 不中断队列；完成后由 WallPage 发本地 toast + Realtime 广播（Task 8 接线）
  ```

- [ ] **Step 1: 写失败测试**（mock supabase 与压缩库）：正常流程调用顺序；单张 insert 抛错 → 入 failures、其他张成功；`nextSortOrder` 纯函数。
- [ ] **Step 2: 跑测试确认失败。**
- [ ] **Step 3: 实现 `upload.ts` 与 UploadButton**（多选 input、pending 禁用、逐张结果提示）。
- [ ] **Step 4: 测试 + build 通过。**
- [ ] **Step 5: Commit**（`feat(upload): 照片压缩直传管线`）

---

### Task 7: 相册墙接真实数据 + 照片删除

**Files:**
- Create: `src/lib/photos.ts`
- Modify: `src/pages/WallPage.tsx`、`src/components/PhotoWallCard.tsx`（owner 删除入口）
- Test: `src/lib/photos.test.ts`

**Interfaces:**
- Consumes: Task 2/5/6。
- Produces:
  ```ts
  export async function listPhotosWithUrls(albumId: string): Promise<PhotoWithUrl[]>   // createSignedUrls 批量签 7 天，按 sort_order, created_at 排序
  export async function deletePhoto(photo: Photo): Promise<void>                       // 先 storage.remove 再 delete 行
  ```

- [ ] **Step 1: 写失败测试**（mock supabase）：路径→签名 URL 映射与排序；deletePhoto 先删对象后删行。
- [ ] **Step 2: 跑测试确认失败。**
- [ ] **Step 3: 实现。** WallPage 加载真实照片映射为 `{id, src: url, caption}` 喂既有 PhotoWall（不改 P1 组件接口）；删除长按/右键，仅 uploader/owner 可见。
- [ ] **Step 4: 测试 + build 通过。**
- [ ] **Step 5: Commit**（`feat(wall): 相册墙接真实照片与删除`）

---

### Task 8: Realtime 实时通知（新增）

**Files:**
- Create: `src/lib/realtime.ts`、`src/components/Toaster.tsx`
- Modify: `src/App.tsx`（挂 Toaster + 全局订阅）、`src/pages/AlbumsPage.tsx`、`src/pages/WallPage.tsx`（操作后广播 + 本地 toast；收到广播刷新 + 弹窗）
- Test: `src/lib/realtime.test.ts`
- Modify: `package.json`（sonner）

**Interfaces:**
- Consumes: Task 2/4。
- Produces:
  ```ts
  export interface AlbumEvent { type: 'album-created' | 'album-updated'; albumId: string; albumName: string }
  export function albumEventToastText(e: AlbumEvent): string
  // 'album-created' → `相册「${albumName}」建好啦`
  // 'album-updated' → '有新的回忆更新啦'
  export function subscribeAlbumEvents(userId: string, onEvent: (e: AlbumEvent) => void): () => void
  // supabase.channel(`user:${userId}`, { config: { private: true } })
  //   .on('broadcast', { event: 'album-event' }, ({ payload }) => onEvent(payload as AlbumEvent)).subscribe()
  export async function publishAlbumEvent(userId: string, e: AlbumEvent): Promise<void>
  // supabase.channel(...).send({ type: 'broadcast', event: 'album-event', payload: e })
  ```

- [ ] **Step 1: 写失败测试**——`albumEventToastText` 两条文案（纯函数）；mock supabase channel：`subscribeAlbumEvents` 收到 broadcast 消息时回调 payload，返回的清理函数调 `unsubscribe`；`publishAlbumEvent` 以 `album-event` 事件名 send。
- [ ] **Step 2: 跑测试确认失败。**
- [ ] **Step 3: 实现 realtime.ts 与 Toaster（sonner `<Toaster richColors position="top-center" />`）。**
- [ ] **Step 4: 接线**——登录后 `subscribeAlbumEvents(session.user.id, ...)`：收到事件 → toast(`albumEventToastText(e)`)，若正在看该相册则重新拉取照片；创建相册/上传完成 → 本地 `toast.success('上传成功')` + `publishAlbumEvent`；登录成功 → `toast.success('登录成功')`。
- [ ] **Step 5: 测试 + build 通过。**
- [ ] **Step 6: Commit**（`feat(realtime): 相册事件广播与 Toast 通知`）

---

## 用户验收清单（P2 全部 Task 完成后执行）

- [ ] 注册两个账号（普通 + 无痕窗口）互不可见对方相册、照片、Storage 文件（Review Focus #2/#6）
- [ ] 手机浏览器实际上传 3 张照片（含 1 张 >5MB 大图），墙正确显示；单张失败有提示且其余成功
- [ ] 删除照片 → 墙刷新消失；删除相册 → Storage 无残留（Dashboard Storage 面板看空桶）
- [ ] 未登录直接访问 `/` 被弹去登录页
- [ ] DevTools Network 里 img 是 `/object/sign/...` 签名 URL
- [ ] **同一账号开两个浏览器窗口：A 窗口上传照片/建相册 → B 窗口弹「有新的回忆更新啦」并自动刷新**（Task 8）
- [ ] 登录/上传成功有本地 toast；关闭 Confirm email 状态下注册即登录（Task 4 口子：开启后应显示确认邮件页）

## Self-Review 记录

1. **Spec 覆盖**：P2 对应 spec §8 的 P2——Task 3/4/5/6/7 覆盖；Realtime 为 spec 未列的新增需求（用户本轮拍板），作为 Task 8。RLS 取 owner 级子集（P5 扩展）已在 Task 3 注明。§2 目标 4/6/8/9/11 属 P3-P7。
2. **Step 扫描**：DB/网络层不可离线 TDD 的部分（真实上传、RLS、Realtime 端到端）归入用户验收清单；可测部分（校验、排序、删除次序、守卫、pending、文案映射、订阅/发布接线）均先失败后通过。
3. **类型一致**：`PhotoWithUrl extends Photo`；`AlbumEvent` 在 Task 8 生产、Task 5/6/7 消费时以 import 引用，不重复定义。
4. **Review Focus**：6 条映射——#1→Task 4 测试；#2→Task 3 SQL 验收+双账号实测；#3→Task 6；#4→Task 5/7；#5→Task 5/6；#6→Task 3 realtime 策略 + Task 8 测试。
5. **比例**：实现给签名与关键约束，SQL 属「规格固定的精确副本」给全文（realtime 策略写法已用 Supabase MCP search_docs 对照官方 Authorization 文档核实）。
6. **v2 变更**：Task 3 改 MCP 执行（用户从「粘贴 SQL」减为「关两个开关」）并加 realtime.messages 策略；Task 4 加邮件确认双态；新增 Task 8 Realtime；验收清单加两项。
