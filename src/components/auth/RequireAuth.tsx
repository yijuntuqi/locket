import { useEffect, useState, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { RealtimeListener } from '@/components/RealtimeListener'
import { supabase } from '@/lib/supabase'

export function RequireAuth({ children }: { children: ReactNode }) {
  const location = useLocation()
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setSession(data.session)
      setLoading(false)
    })
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      setLoading(false)
    })
    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-white/60">
        加载中…
      </div>
    )
  }
  // 登录后原路返回（WallPage 等受保护页用）
  if (!session)
    return (
      <Navigate
        to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`}
        replace
      />
    )
  return (
    <>
      {children}
      <RealtimeListener />
    </>
  )
}
