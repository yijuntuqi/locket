-- Locket 初始结构：相册 / 照片 / 私有桶 / Realtime 私有频道授权
-- P2 范围为 owner 级可见性；P5 将在此扩展关注者策略（photos select/insert 与 realtime.messages）。

create table public.albums (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 50),
  allow_collab_upload boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.photos (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references public.albums (id) on delete cascade,
  uploader_id uuid not null references auth.users (id) on delete cascade,
  storage_path text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index photos_album_idx on public.photos (album_id, sort_order);

alter table public.albums enable row level security;
alter table public.photos enable row level security;

-- albums：仅 owner 可读写
create policy albums_owner_select on public.albums for select
  using (auth.uid() = owner_id);
create policy albums_owner_insert on public.albums for insert
  with check (auth.uid() = owner_id);
create policy albums_owner_update on public.albums for update
  using (auth.uid() = owner_id);
create policy albums_owner_delete on public.albums for delete
  using (auth.uid() = owner_id);

-- photos：可见性跟随相册 owner；删除允许 uploader 本人或相册 owner（为 P5 协作上传预留）
create policy photos_owner_select on public.photos for select
  using (auth.uid() = (select owner_id from public.albums where id = album_id));
create policy photos_owner_insert on public.photos for insert
  with check (
    auth.uid() = uploader_id
    and auth.uid() = (select owner_id from public.albums where id = album_id)
  );
create policy photos_owner_delete on public.photos for delete
  using (
    auth.uid() = uploader_id
    or auth.uid() = (select owner_id from public.albums where id = album_id)
  );

-- Storage：私有桶，路径首段 = owner_id（{owner_id}/{album_id}/{photo_id}.webp）
insert into storage.buckets (id, name, public)
values ('photos', 'photos', false);

create policy photos_storage_owner_read on storage.objects for select
  using (bucket_id = 'photos' and auth.uid()::text = (storage.foldername(name))[1]);
create policy photos_storage_owner_insert on storage.objects for insert
  with check (bucket_id = 'photos' and auth.uid()::text = (storage.foldername(name))[1]);
create policy photos_storage_owner_update on storage.objects for update
  using (bucket_id = 'photos' and auth.uid()::text = (storage.foldername(name))[1]);
create policy photos_storage_owner_delete on storage.objects for delete
  using (bucket_id = 'photos' and auth.uid()::text = (storage.foldername(name))[1]);

-- Realtime：私有频道 user:{uid}，P2 仅本人可收发；P5 扩展关注者。
-- 官方 Authorization 文档模式：https://supabase.com/docs/guides/realtime/authorization
-- 前提：Dashboard → Realtime → Settings 关闭 "Allow public access"。
create policy "owner receive own album events" on "realtime"."messages" for select
  to authenticated
  using ((select realtime.topic()) = 'user:' || (select auth.uid()::text));
create policy "owner send own album events" on "realtime"."messages" for insert
  to authenticated
  with check ((select realtime.topic()) = 'user:' || (select auth.uid()::text));
