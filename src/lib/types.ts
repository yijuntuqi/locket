import type { WallLayout } from './layouts'

export interface Album {
  id: string
  owner_id: string
  name: string
  allow_collab_upload: boolean
  wall_layout: WallLayout
  created_at: string
}

export interface Photo {
  id: string
  album_id: string
  uploader_id: string
  storage_path: string
  sort_order: number
  created_at: string
}

export interface PhotoWithUrl extends Photo {
  url: string
}
