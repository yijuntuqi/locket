import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Backdrop } from '@/components/Backdrop'
import { AppToaster } from '@/components/Toaster'
import { RequireAuth } from '@/components/auth/RequireAuth'
import AlbumsPage from '@/pages/AlbumsPage'
import LoginPage from '@/pages/LoginPage'
import WallPage from '@/pages/WallPage'

export default function App() {
  return (
    <BrowserRouter>
      <div className="h-screen w-screen overflow-hidden bg-slate-950">
        <Backdrop />
        <AppToaster />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <RequireAuth>
                <AlbumsPage />
              </RequireAuth>
            }
          />
          <Route
            path="/album/:albumId"
            element={
              <RequireAuth>
                <WallPage />
              </RequireAuth>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}
