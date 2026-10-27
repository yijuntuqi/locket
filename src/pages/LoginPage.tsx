import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { glassPanel } from '@/lib/glass'
import { supabase } from '@/lib/supabase'

type Mode = 'login' | 'signup'

export default function LoginPage() {
  const navigate = useNavigate()
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
        navigate('/', { replace: true })
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        })
        if (signUpError) throw signUpError
        if (data.session) {
          toast.success('登录成功')
          navigate('/', { replace: true })
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
    'w-full rounded-md border border-white/15 bg-white/10 px-3 py-2 text-white placeholder:text-white/40 focus:border-white/40 focus:outline-none'

  return (
    <div className="flex h-full items-center justify-center">
      <form
        onSubmit={onSubmit}
        className={`w-80 space-y-4 p-6 ${glassPanel}`}
      >
        <h1 className="text-center text-xl font-semibold text-white">
          Locket
        </h1>
        <p className="text-center text-sm text-white/50">
          {mode === 'login' ? '登录你的照片盒' : '注册一个新账号'}
        </p>

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
          className="w-full rounded-md bg-white px-3 py-2 font-medium text-slate-900 disabled:opacity-50"
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
