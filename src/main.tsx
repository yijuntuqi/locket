import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// 字体本地打包（fontsource 按 unicode-range 分片，中文按需加载，无外链请求）
import '@fontsource-variable/geist'
import '@fontsource-variable/noto-serif-sc'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// PWA 离线壳：仅生产注册（dev 下 sw 会缓存模块请求干扰 HMR）
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => undefined)
}
