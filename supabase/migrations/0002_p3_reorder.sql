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
