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
