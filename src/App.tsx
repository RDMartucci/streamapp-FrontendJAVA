import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/auth'
import { Layout } from './components/Layout'
import { LoginPage } from './pages/LoginPage'
import { RootsPage } from './pages/RootsPage'
import { ExplorerPage } from './pages/ExplorerPage'
import { FavoritesPage } from './pages/FavoritesPage'
import { PlaylistsPage } from './pages/PlaylistsPage'
import { PlayerPage } from './pages/PlayerPage'
import { AdminPage } from './pages/AdminPage'
import type { ReactNode } from 'react'

function Protected({ children }: { children: ReactNode }) {
  const { token } = useAuth()
  if (!token) {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}

function AdminOnly({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  if (user?.role !== 'ROLE_ADMIN') {
    return <Navigate to="/" replace />
  }
  return <>{children}</>
}

function Router() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <Protected>
            <Layout />
          </Protected>
        }
      >
        <Route index element={<ExplorerPage />} />
        <Route path="raices" element={<RootsPage />} />
        <Route path="favoritos" element={<FavoritesPage />} />
        <Route path="playlists" element={<PlaylistsPage />} />
        <Route
          path="admin"
          element={
            <AdminOnly>
              <AdminPage />
            </AdminOnly>
          }
        />
      </Route>
      <Route
        path="/player"
        element={
          <Protected>
            <PlayerPage />
          </Protected>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Router />
      </BrowserRouter>
    </AuthProvider>
  )
}
