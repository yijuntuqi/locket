import { supabase } from '@/lib/supabase'

export interface AlbumEvent {
  type: 'album-created' | 'album-updated'
  albumId: string
  albumName: string
}

export function albumEventToastText(e: AlbumEvent): string {
  return e.type === 'album-created'
    ? `相册「${e.albumName}」建好啦`
    : '有新的回忆更新啦'
}

export function subscribeAlbumEvents(
  userId: string,
  onEvent: (e: AlbumEvent) => void
): () => void {
  const channel = supabase
    .channel(`user:${userId}`, { config: { private: true } })
    .on('broadcast', { event: 'album-event' }, ({ payload }) => {
      onEvent(payload as AlbumEvent)
    })
    .subscribe()
  return () => {
    void supabase.removeChannel(channel)
  }
}

export async function publishAlbumEvent(
  userId: string,
  e: AlbumEvent
): Promise<void> {
  const channel = supabase.channel(`user:${userId}`, {
    config: { private: true },
  })
  const status = await channel.send({
    type: 'broadcast',
    event: 'album-event',
    payload: e,
  })
  await supabase.removeChannel(channel)
  if (status !== 'ok') throw new Error(`broadcast 发送失败（${status}）`)
}
