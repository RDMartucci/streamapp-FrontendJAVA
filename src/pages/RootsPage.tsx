import { useCallback, useEffect, useState } from 'react'
import { rootsService } from '../services/roots'
import { ApiClientError } from '../lib/api'

export function RootsPage() {
  const [roots, setRoots] = useState<string[]>([])
  const [newPath, setNewPath] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setRoots(await rootsService.list())
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Error al cargar las raíces')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const addRoot = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPath.trim()) return
    setError('')
    setBusy(true)
    try {
      setRoots(await rootsService.add(newPath.trim()))
      setNewPath('')
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Error al agregar la raíz')
    } finally {
      setBusy(false)
    }
  }

  const removeRoot = async (path: string) => {
    setError('')
    setBusy(true)
    try {
      setRoots(await rootsService.remove(path))
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Error al quitar la raíz')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>Mis raíces</h1>
      </header>

      <p className="muted">
        Las raíces son las carpetas de tu computadora que StreamApp puede explorar y reproducir.
        Configurá una carpeta para que aparezca en el explorador.
      </p>

      {error && <div className="alert alert-error">{error}</div>}

      <section className="panel">
        <h2>Agregar carpeta</h2>
        <form className="form-row" onSubmit={(e) => void addRoot(e)}>
          <input
            className="input input-grow"
            placeholder="Ruta absoluta (ej: D:/media)"
            value={newPath}
            onChange={(e) => setNewPath(e.target.value)}
            required
          />
          <button type="submit" className="btn btn-primary" disabled={busy || !newPath.trim()}>
            Agregar
          </button>
        </form>
      </section>

      <section className="panel">
        <h2>Raíces configuradas ({roots.length}/5)</h2>
        {loading ? (
          <div className="muted">Cargando...</div>
        ) : roots.length === 0 ? (
          <div className="muted">Aún no configuraste ninguna raíz.</div>
        ) : (
          <div className="list">
            {roots.map((root) => (
              <div key={root} className="list-row">
                <span className="list-icon">📁</span>
                <span className="list-title">{root}</span>
                <button type="button" className="btn btn-danger" onClick={() => void removeRoot(root)} disabled={busy}>
                  Quitar
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}