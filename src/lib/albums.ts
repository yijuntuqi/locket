import { supabase } from '@/lib/supabase'
import type { Album } from '@/lib/types'

export class ValidationError extends Error {}

export function validateAlbumName(name: string): string {
  const trimmed = name.trim()
  if (trimmed.length === 0) throw new ValidationError('相册名不能为空')
  if (trimmed.length > 50) throw new ValidationError('相册名不能超过 50 字')
  return trimmed
}

export async function listAlbums(): Promise<Album[]> {
  const { data, error } = await supabase
    .from('albums')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as Album[]
}

export async function createAlbum(name: string): Promise<Album> {
  const trimmed = validateAlbumName(name)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('未登录')
  const { data, error } = await supabase
    .from('albums')
    .insert({ name: trimmed, owner_id: user.id })
    .select()
    .single()
  if (error) throw error
  return data as Album
}

export async function renameAlbum(id: string, name: string): Promise<void> {
  const trimmed = validateAlbumName(name)
  const { error } = await supabase
    .from('albums')
    .update({ name: trimmed })
    .eq('id', id)
  if (error) throw error
}

export async function deleteAlbum(album: Album): Promise<void> {
  const { data: photos, error: listError } = await supabase
    .from('photos')
    .select('storage_path')
    .eq('album_id', album.id)
  if (listError) throw listError
  const paths = (photos ?? [])
    .map((p) => p.storage_path)
    .filter((p): p is string => typeof p === 'string' && p.length > 0)
  if (paths.length > 0) {
    const { error: storageError } = await supabase.storage.from('photos').remove(paths)
    if (storageError) throw storageError
  }
  const { error } = await supabase.from('albums').delete().eq('id', album.id)
  if (error) throw error
}
