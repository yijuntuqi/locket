import { useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Gem } from 'lucide-react'
import { glassPanel } from '@/lib/glass'
import { supabase } from '@/lib/supabase'

type Mode = 'login' | 'signup'

/** 登录后去哪：只接受站内相对路径（分享链接 /s/{code} 登录后原路返回），防开放重定向 */
function safeNext(raw: string | null): string {
  return raw && raw.startsWith('/') && !raw.startsWith('//') ? raw : '/'
}

export default function LoginPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const next = safeNext(searchParams.get('next'))
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setNotice(null)
    setPending(true)
    try {
      if (mode === 'login') {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (signInError) throw signInError
        toast.success('登录成功')
        navigate(next, { replace: true })
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        })
        if (signUpError) throw signUpError
        if (data.session) {
          toast.success('登录成功')
          navigate(next, { replace: true })
        } else {
          // 后台开启 Confirm email 后走这里：留好的口子，无需改代码
          setNotice('注册成功，请查收确认邮件激活后登录')
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败，请重试')
    } finally {
      setPending(false)
    }
  }

  const inputCls =
    'w-full rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-white placeholder:text-white/40 focus:border-white/40 focus:bg-white/15 focus:outline-none'

  return (
    <div className="flex h-full items-center justify-center">
      <form
        onSubmit={onSubmit}
        data-testid="page-enter"
        className={`w-80 space-y-4 p-7 ${glassPanel}`}
        style={{ animation: 'fade-blur-in 0.5s ease-out both' }}
      >
        <div className="flex flex-col items-center gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-white/5 shadow-[0_4px_20px_rgba(0,0,0,0.35)]">
            <Gem className="h-5 w-5 text-gilt" aria-hidden />
          </div>
          <h1 className="font-display-gradient font-display text-4xl font-black tracking-[0.18em]">
            Locket
          </h1>
          <p className="text-center text-sm text-white/50">
            {mode === 'login' ? '登录你的照片盒' : '注册一个新账号'}
          </p>
        </div>

        <input
          aria-label="邮箱"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="邮箱"
          className={inputCls}
        />
        <input
          aria-label="密码"
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="密码（至少 6 位）"
          className={inputCls}
        />

        {error && <p className="text-sm text-red-400">{error}</p>}
        {notice && <p className="text-sm text-emerald-300">{notice}</p>}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-gradient-to-b from-[#f8ecd2] to-gilt px-3 py-2 font-semibold text-[#3a2c12] shadow-[0_4px_20px_rgba(232,201,138,0.25)] disabled:opacity-50"
        >
          {pending ? '请稍候…' : mode === 'login' ? '登录' : '注册'}
        </button>

        <button
          type="button"
          onClick={() => {
            setMode(mode === 'login' ? 'signup' : 'login')
            setError(null)
            setNotice(null)
          }}
          className="w-full text-center text-sm text-white/60 hover:text-white"
        >
          {mode === 'login' ? '去注册' : '去登录'}
        </button>
      </form>
    </div>
  )
}
