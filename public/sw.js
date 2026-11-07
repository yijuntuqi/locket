/* Locket Service Worker：PWA 离线应用壳
   - 预缓存应用壳（/、index.html、manifest、favicon）
   - 带 hash 的 /assets/* cache-first（内容变则名变，永不过期）
   - 页面导航 network-first，离线回退到缓存的 index.html（SPA 全路由可用）
   - Supabase REST/Storage/Realtime 一律直连，不做离线数据（照片属私有签名 URL） */
const VERSION = 'locket-v1'
const SHELL = `${VERSION}-shell`
const PRECACHE = ['/', '/index.html', '/manifest.webmanifest', '/favicon.svg']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== SHELL).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  // 跨域（Supabase 等）直连，不拦
  if (url.origin !== self.location.origin) return

  // 导航请求：network-first，离线回退壳页面
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const copy = res.clone()
          caches.open(SHELL).then((cache) => cache.put('/index.html', copy))
          return res
        })
        .catch(() => caches.match('/index.html'))
    )
    return
  }

  // 带 hash 的构建产物：cache-first
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(event.request).then(
        (hit) =>
          hit ??
          fetch(event.request).then((res) => {
            const copy = res.clone()
            caches.open(SHELL).then((cache) => cache.put(event.request, copy))
            return res
          })
      )
    )
  }
})
