import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { authService } from '../services/auth'
import { ApiClientError } from '../lib/api'
import type { UserDto } from '../types'

export function Layout() {
  const { user, logout } = useAuth()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem('streamapp-sidebar-collapsed') === 'true')
  const [showUserModal, setShowUserModal] = useState(false)
  const [userInfo, setUserInfo] = useState<UserDto | null>(null)
  const [loadingInfo, setLoadingInfo] = useState(false)
  const [infoError, setInfoError] = useState('')

  const openUserInfo = async () => {
    setShowUserModal(true)
    setLoadingInfo(true)
    setInfoError('')
    try {
      const info = await authService.me()
      setUserInfo(info)
    } catch (err) {
      setInfoError(err instanceof ApiClientError ? err.message : 'Error al cargar info del usuario')
    } finally {
      setLoadingInfo(false)
    }
  }

  const toggleSidebar = () => {
    setSidebarCollapsed((collapsed) => {
      const next = !collapsed
      localStorage.setItem('streamapp-sidebar-collapsed', String(next))
      return next
    })
  }

  return (
    <div className={`app-shell${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}>
      <aside className="sidebar">
        <div className="brand-row">
          <div className="brand">
            <span className="brand-dot" />
            <span className="brand-label">StreamApp</span>
          </div>
          <button
            type="button"
            className="sidebar-toggle"
            onClick={toggleSidebar}
            aria-label={sidebarCollapsed ? 'Mostrar navegación' : 'Ocultar navegación'}
            title={sidebarCollapsed ? 'Mostrar navegación' : 'Ocultar navegación'}
          >
            {sidebarCollapsed ? '›' : '‹'}
          </button>
        </div>
        <nav className="nav">
          <NavLink to="/" end className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
            <span className="nav-icon">▤</span><span className="nav-label">Biblioteca</span>
          </NavLink>
          <NavLink to="/explorador" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
            <span className="nav-icon">⌂</span><span className="nav-label">Explorador</span>
          </NavLink>
          <NavLink to="/raices" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
            <span className="nav-icon">▣</span><span className="nav-label">Mis raíces</span>
          </NavLink>
          <NavLink to="/favoritos" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
            <span className="nav-icon">★</span><span className="nav-label">Favoritos</span>
          </NavLink>
          <NavLink to="/playlists" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
            <span className="nav-icon">≡</span><span className="nav-label">Playlists</span>
          </NavLink>
          {user?.role === 'ROLE_ADMIN' && (
            <NavLink to="/admin" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              <span className="nav-icon">⚙</span><span className="nav-label">Admin</span>
            </NavLink>
          )}
        </nav>
        <div className="sidebar-footer">
          <button type="button" className="user-chip" onClick={() => void openUserInfo()} title="Ver mi información">
            <span className="user-avatar">{user?.username?.[0]?.toUpperCase()}</span>
            <div className="user-info">
              <span className="user-name">{user?.username}</span>
              <span className="user-role">{user?.role.replace('ROLE_', '')}</span>
            </div>
          </button>
          <button type="button" className="btn btn-ghost btn-block logout-button" onClick={logout} title="Cerrar sesión">
            <span>↪</span><span className="nav-label">Cerrar sesión</span>
          </button>
        </div>
      </aside>
      <main className="content">
        <Outlet />
      </main>

      {showUserModal && (
        <div className="modal-overlay" onClick={() => setShowUserModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Mi información</h2>
              <button type="button" className="btn btn-ghost" onClick={() => setShowUserModal(false)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              {loadingInfo ? (
                <div className="muted">Cargando...</div>
              ) : infoError ? (
                <div className="alert alert-error">{infoError}</div>
              ) : userInfo ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span className="user-avatar" style={{ width: 48, height: 48, fontSize: 18 }}>
                      {userInfo.username[0]?.toUpperCase()}
                    </span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 16 }}>{userInfo.username}</div>
                      <div className="muted" style={{ fontSize: 13 }}>{userInfo.role.replace('ROLE_', '')}</div>
                    </div>
                  </div>
                  <div className="gnulahd-grid" style={{ marginTop: 4 }}>
                    <div>
                      <span className="muted">ID</span>
                      <br />
                      <strong>{userInfo.id}</strong>
                    </div>
                    <div>
                      <span className="muted">Usuario</span>
                      <br />
                      <strong>{userInfo.username}</strong>
                    </div>
                    <div>
                      <span className="muted">Rol</span>
                      <br />
                      <strong>{userInfo.role.replace('ROLE_', '')}</strong>
                    </div>
                    <div>
                      <span className="muted">Alta</span>
                      <br />
                      <strong>{userInfo.createdAt ? new Date(userInfo.createdAt).toLocaleString('es-AR') : '—'}</strong>
                    </div>
                  </div>
                  <p className="muted" style={{ fontSize: 12, margin: 0 }}>Info obtenida desde <code>GET /api/auth/me</code></p>
                </div>
              ) : null}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-ghost" onClick={() => setShowUserModal(false)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
