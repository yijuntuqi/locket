import { supabase } from '@/lib/supabase'
import { isWallLayout, type WallLayout } from '@/lib/layouts'
import { getAlbumSummary } from '@/lib/photos'
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

export interface AlbumWithSummary extends Album {
  coverUrl: string | null
  photoCount: number
}

/** 相册列表 + 封面/张数摘要；单个相册摘要失败不挡列表展示（降级为无封面） */
export async function listAlbumsWithSummaries(): Promise<AlbumWithSummary[]> {
  const albums = await listAlbums()
  return Promise.all(
    albums.map(async (album) => {
      try {
        const { coverUrl, count } = await getAlbumSummary(album.id)
        return { ...album, coverUrl, photoCount: count }
      } catch {
        return { ...album, coverUrl: null, photoCount: 0 }
      }
    })
  )
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

export async function setAlbumLayout(id: string, layout: WallLayout): Promise<void> {
  if (!isWallLayout(layout)) throw new ValidationError('未知布局')
  const { error } = await supabase
    .from('albums')
    .update({ wall_layout: layout })
    .eq('id', id)
  if (error) throw error
}

/** 分享码字母表：去掉 0/o/1/i/l 等易混淆字符；32 恰好整除 256，无取模偏差 */
const SHARE_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'

function generateShareCode(length = 12): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(bytes, (b) => SHARE_ALPHABET[b % SHARE_ALPHABET.length]).join('')
}

/** 开/关链接分享：开启生成 12 位分享码（唯一约束冲突重试），关闭置 null 即撤回链接 */
export async function setAlbumSharing(id: string, shared: boolean): Promise<string | null> {
  if (!shared) {
    const { error } = await supabase.from('albums').update({ share_code: null }).eq('id', id)
    if (error) throw error
    return null
  }
  for (let attempt = 0; ; attempt++) {
    const code = generateShareCode()
    const { data, error } = await supabase
      .from('albums')
      .update({ share_code: code })
      .eq('id', id)
      .select('share_code')
      .single()
    if (!error) return (data as { share_code: string } | null)?.share_code ?? code
    // 23505：分享码撞唯一约束（概率可忽略），换一个再试
    if ((error as { code?: string }).code !== '23505' || attempt >= 2) throw error
  }
}

export async function setAlbumCollabUpload(id: string, allow: boolean): Promise<void> {
  const { error } = await supabase
    .from('albums')
    .update({ allow_collab_upload: allow })
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
