-- reorder_photos：按 ordered_ids 数组顺序重排相册内照片的 sort_order（0..n-1）
-- 唯一索引逐行即时检查，直接赋值任意重排都会撞键；
-- 函数内先整体偏移出冲突区间再写终值，同一事务完成，原子且一次往返。
create or replace function public.reorder_photos(ordered_ids uuid[])
returns void
language plpgsql
security invoker
as $$
begin
  update photos
  set sort_order = sort_order + 1000000
  where id = any(ordered_ids);

  update photos p
  set sort_order = t.idx
  from (
    select id, ord - 1 as idx
    from unnest(ordered_ids) with ordinality as u(id, ord)
  ) t
  where p.id = t.id;
end;
$$;

grant execute on function public.reorder_photos(uuid[]) to authenticated;

-- album_id / uploader_id / storage_path 不可变：UPDATE 策略的 WITH CHECK 拦不住
-- 把照片改挂到别的相册（INSERT 会拦的路径 UPDATE 拦不住），用触发器兜死。
create or replace function public.photos_immutable_fields()
returns trigger
language plpgsql
security invoker
as $$
begin
  if new.album_id <> old.album_id
     or new.uploader_id <> old.uploader_id
     or new.storage_path <> old.storage_path then
    raise exception 'album_id/uploader_id/storage_path 不可修改';
  end if;
  return new;
end;
$$;

drop trigger if exists photos_immutable_fields on photos;
create trigger photos_immutable_fields
before update on photos
for each row execute function public.photos_immutable_fields();
