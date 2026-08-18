import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../lib/auth'

export function Layout() {
  const { user, logout } = useAuth()

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-dot" />
          StreamApp
        </div>
        <nav className="nav">
          <NavLink to="/" end className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
            Explorador
          </NavLink>
          <NavLink to="/raices" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
            Mis raíces
          </NavLink>
          <NavLink to="/favoritos" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
            Favoritos
          </NavLink>
          <NavLink to="/playlists" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
            Playlists
          </NavLink>
          {user?.role === 'ROLE_ADMIN' && (
            <NavLink to="/admin" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              Admin
            </NavLink>
          )}
        </nav>
        <div className="sidebar-footer">
          <div className="user-chip">
            <span className="user-avatar">{user?.username?.[0]?.toUpperCase()}</span>
            <div className="user-info">
              <span className="user-name">{user?.username}</span>
              <span className="user-role">{user?.role.replace('ROLE_', '')}</span>
            </div>
          </div>
          <button type="button" className="btn btn-ghost btn-block" onClick={logout}>
            Cerrar sesión
          </button>
        </div>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  )
}
