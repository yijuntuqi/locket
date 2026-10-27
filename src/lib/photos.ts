import { supabase } from '@/lib/supabase'
import type { Photo, PhotoWithUrl } from '@/lib/types'

const SIGN_URL_EXPIRY_SEC = 60 * 60 * 24 * 7 // 7 天

export async function listPhotosWithUrls(albumId: string): Promise<PhotoWithUrl[]> {
  const { data: photos, error } = await supabase
    .from('photos')
    .select('*')
    .eq('album_id', albumId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) throw error

  const list = (photos ?? []) as Photo[]
  if (list.length === 0) return []

  const { data: signed, error: signError } = await supabase.storage
    .from('photos')
    .createSignedUrls(
      list.map((p) => p.storage_path),
      SIGN_URL_EXPIRY_SEC
    )
  if (signError) throw signError

  const urlByPath = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]))
  return list.map((p) => ({ ...p, url: urlByPath.get(p.storage_path) ?? '' }))
}

export async function deletePhoto(photo: Photo): Promise<void> {
  const { error: storageError } = await supabase.storage
    .from('photos')
    .remove([photo.storage_path])
  if (storageError) throw storageError
  const { error } = await supabase.from('photos').delete().eq('id', photo.id)
  if (error) throw error
}

export function reorderPhotos<T extends { id: string }>(
  items: T[],
  fromIndex: number,
  toIndex: number
): T[] {
  if (fromIndex === toIndex) return items
  if (fromIndex < 0 || toIndex < 0 || fromIndex >= items.length || toIndex >= items.length) {
    return items
  }
  const reordered = [...items]
  const [moved] = reordered.splice(fromIndex, 1)
  reordered.splice(toIndex, 0, moved)
  return reordered.map((item, i) => ({ ...item, sort_order: i }) as T)
}

export async function persistSortOrder(
  updates: { id: string; sort_order: number }[]
): Promise<void> {
  // 走 RPC 而非逐行 UPDATE：唯一索引逐行即时检查，客户端重排赋值必然撞键，
  // 函数内部先整体偏移再写终值，一个事务完成
  const { error } = await supabase.rpc('reorder_photos', {
    ordered_ids: updates.map((u) => u.id),
  })
  if (error) throw error
}
