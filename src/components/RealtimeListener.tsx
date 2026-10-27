import { useEffect } from 'react'
import { toast } from 'sonner'
import { albumEventToastText, subscribeAlbumEvents } from '@/lib/realtime'
import { supabase } from '@/lib/supabase'

export const ALBUM_UPDATED_EVENT = 'locket:album-updated'
export const ALBUMS_CHANGED_EVENT = 'locket:albums-changed'

export function RealtimeListener() {
  useEffect(() => {
    let cleanup: (() => void) | undefined
    let cancelled = false
    supabase.auth.getUser().then(({ data }) => {
      if (cancelled || !data.user) return
      cleanup = subscribeAlbumEvents(data.user.id, (e) => {
        toast(albumEventToastText(e))
        window.dispatchEvent(
          new CustomEvent(
            e.type === 'album-updated'
              ? ALBUM_UPDATED_EVENT
              : ALBUMS_CHANGED_EVENT,
            { detail: e.albumId }
          )
        )
      })
    })
    return () => {
      cancelled = true
      cleanup?.()
    }
  }, [])
  return null
}
