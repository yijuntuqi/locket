-- 相册分享链接：share_code 非空 = 「有链接者可见」（访客免登录看墙）；
-- allow_collab_upload（0001 预留列）= 登录访客可向相册上传，uploader 记本人。
alter table public.albums
  add column share_code text unique;

-- 相册：任何人可读有分享码的相册（含 anon；owner 原策略并行生效）
create policy albums_shared_select on public.albums for select
  using (share_code is not null);

-- 照片：分享相册的照片对所有人可见（含 anon）
create policy photos_shared_select on public.photos for select
  using (exists (
    select 1 from public.albums a
    where a.id = album_id and a.share_code is not null
  ));

-- 照片：协作上传——登录用户、uploader 记本人、相册已分享且开了协作
create policy photos_collab_insert on public.photos for insert
  to authenticated
  with check (
    auth.uid() = uploader_id
    and exists (
      select 1 from public.albums a
      where a.id = album_id and a.share_code is not null and a.allow_collab_upload
    )
  );

-- Storage：分享相册下的对象对所有人可读（签名 URL 生成同样走这条；
-- 路径约定 {owner_id}/{album_id}/{photo_id}.webp）
create policy photos_storage_shared_read on storage.objects for select
  using (
    bucket_id = 'photos'
    and exists (
      select 1 from public.albums a
      where a.share_code is not null
        and (storage.foldername(name))[1] = a.owner_id::text
        and (storage.foldername(name))[2] = a.id::text
    )
  );

-- Storage：协作上传——对象必须落在已开协作的分享相册路径段下
create policy photos_storage_collab_insert on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'photos'
    and exists (
      select 1 from public.albums a
      where a.share_code is not null and a.allow_collab_upload
        and (storage.foldername(name))[1] = a.owner_id::text
        and (storage.foldername(name))[2] = a.id::text
    )
  );

-- Storage：协作者可删自己上传的对象（回查 photos 表按 uploader 判定）
create policy photos_storage_collab_delete on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'photos'
    and exists (
      select 1 from public.photos p
      where p.storage_path = name and p.uploader_id = auth.uid()
    )
  );
