import imageCompression from 'browser-image-compression'
import { supabase } from '@/lib/supabase'
import type { Photo } from '@/lib/types'

export interface UploadResult {
  photo: Photo
  fileName: string
}

export interface UploadFailure {
  fileName: string
  error: string
}

export interface UploadSummary {
  results: UploadResult[]
  failures: UploadFailure[]
}

export function nextSortOrder(photos: Pick<Photo, 'sort_order'>[]): number {
  return photos.reduce((max, p) => Math.max(max, p.sort_order), -1) + 1
}

async function compressPhoto(file: File): Promise<File> {
  return imageCompression(file, {
    maxSizeMB: 0.3,
    maxWidthOrHeight: 2048,
    useWebWorker: true,
    fileType: 'image/webp',
  })
}

export async function uploadPhotos(
  albumId: string,
  ownerId: string,
  files: File[]
): Promise<UploadSummary> {
  const { data: existing, error: listError } = await supabase
    .from('photos')
    .select('sort_order')
    .eq('album_id', albumId)
  if (listError) throw listError

  let sortOrder = nextSortOrder((existing ?? []) as Pick<Photo, 'sort_order'>[])
  const results: UploadResult[] = []
  const failures: UploadFailure[] = []

  for (const file of files) {
    const storagePath = `${ownerId}/${albumId}/${crypto.randomUUID()}.webp`
    try {
      const compressed = await compressPhoto(file)
      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(storagePath, compressed)
      if (uploadError) throw uploadError

      const { data, error: insertError } = await supabase
        .from('photos')
        .insert({
          album_id: albumId,
          uploader_id: ownerId,
          storage_path: storagePath,
          sort_order: sortOrder,
        })
        .select()
        .single()
      if (insertError) {
        await supabase.storage.from('photos').remove([storagePath])
        throw insertError
      }
      sortOrder += 1
      results.push({ photo: data as Photo, fileName: file.name })
    } catch (err) {
      failures.push({
        fileName: file.name,
        error: err instanceof Error ? err.message : '上传失败',
      })
    }
  }

  return { results, failures }
}
