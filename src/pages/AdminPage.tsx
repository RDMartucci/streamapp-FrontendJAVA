import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { api, ApiClientError } from '../lib/api'
import type { AdminDeleteResult, Role, UserDto } from '../types'

export function AdminPage() {
  const [users, setUsers] = useState<UserDto[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<Role>('ROLE_USER')
  const [deletePath, setDeletePath] = useState('')
  const [deleteResult, setDeleteResult] = useState<AdminDeleteResult | null>(null)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true)
    try {
      setUsers(await api.get<UserDto[]>('/admin/users'))
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Error al listar usuarios')
    } finally {
      setLoadingUsers(false)
    }
  }, [])

  useEffect(() => {
    void loadUsers()
  }, [loadUsers])

  const createUser = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setInfo('')
    setBusy(true)
    try {
      await api.post('/admin/users', { username: username.trim(), password, role })
      setUsername('')
      setPassword('')
      setInfo(`Usuario ${username.trim()} creado`)
      await loadUsers()
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Error al crear usuario')
    } finally {
      setBusy(false)
    }
  }

  const deleteContent = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setInfo('')
    setDeleteResult(null)
    setBusy(true)
    try {
      const result = await api.delete<AdminDeleteResult>('/admin/media', { query: { path: deletePath.trim() } })
      setDeleteResult(result)
      setInfo('Contenido eliminado')
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Error al borrar contenido')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>Administración</h1>
      </header>

      {error && <div className="alert alert-error">{error}</div>}
      {info && <div className="alert alert-info">{info}</div>}

      <section className="panel">
        <h2>Crear usuario</h2>
        <form className="form-row" onSubmit={(e) => void createUser(e)}>
          <input
            className="input"
            placeholder="Usuario (mín. 3)"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            minLength={3}
            required
          />
          <input
            className="input"
            type="password"
            placeholder="Contraseña (mín. 6)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
          />
          <select className="input" value={role} onChange={(e) => setRole(e.target.value as Role)}>
            <option value="ROLE_USER">USER</option>
            <option value="ROLE_ADMIN">ADMIN</option>
          </select>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            Crear
          </button>
        </form>
      </section>

      <section className="panel">
        <h2>Borrar contenido</h2>
        <p className="muted">
          Elimina archivos o carpetas (recursivo) dentro de las raíces de cualquier usuario. Las raíces mismas están
          protegidas. Esta acción es permanente.
        </p>
        <form className="form-row" onSubmit={(e) => void deleteContent(e)}>
          <input
            className="input input-grow"
            placeholder="Path absoluto (ej: D:/media/peliculas)"
            value={deletePath}
            onChange={(e) => setDeletePath(e.target.value)}
            required
          />
          <button type="submit" className="btn btn-danger" disabled={busy}>
            Borrar
          </button>
        </form>
        {deleteResult && (
          <div className="result-box">
            Path: <code>{deleteResult.path}</code>
            <br />
            Archivos eliminados: <strong>{deleteResult.filesDeleted}</strong> · Items del catálogo removidos:{' '}
            <strong>{deleteResult.catalogItemsRemoved}</strong>
          </div>
        )}
      </section>

      <section className="panel">
        <h2>Usuarios ({users.length})</h2>
        {loadingUsers ? (
          <div className="muted">Cargando...</div>
        ) : users.length === 0 ? (
          <div className="muted">Sin usuarios.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Usuario</th>
                <th>Rol</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.id}</td>
                  <td>{u.username}</td>
                  <td>{u.role.replace('ROLE_', '')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}
