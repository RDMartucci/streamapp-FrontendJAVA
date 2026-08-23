import { useCallback, useEffect, useState } from 'react'
import { fsBrowserService } from '../services/fsBrowser'
import { ApiClientError } from '../lib/api'
import type { FsEntry } from '../types'

interface FileBrowserModalProps {
  onSelect: (path: string) => void
  onClose: () => void
}

export function FileBrowserModal({ onSelect, onClose }: FileBrowserModalProps) {
  const [entries, setEntries] = useState<FsEntry[]>([])
  const [currentPath, setCurrentPath] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async (path: string | null) => {
    setLoading(true)
    setError('')
    try {
      const list = path === null
        ? await fsBrowserService.roots()
        : await fsBrowserService.list(path)
      setEntries(list)
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Error al cargar')
      setEntries([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load(null)
  }, [load])

  const navigateInto = (path: string) => {
    setCurrentPath(path)
    void load(path)
  }

  const goBack = () => {
    if (currentPath === null) return
    const parent = currentPath.replace(/\/[^/]+\/?$/, '') || null
    setCurrentPath(parent)
    void load(parent)
  }

  const crumbs = currentPath?.split('/').filter(Boolean) ?? []

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Seleccionar carpeta</h2>
          <button type="button" className="btn btn-ghost" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {currentPath !== null && (
            <div className="breadcrumbs">
              <button type="button" className="crumb" onClick={goBack}>
                ← Atrás
              </button>
              {crumbs.map((c, i) => {
                const full = crumbs.slice(0, i + 1).join('/')
                return (
                  <span key={full}>
                    <span className="crumb-sep">/</span>
                    <button
                      type="button"
                      className="crumb"
                      onClick={() => { setCurrentPath(full); void load(full) }}
                    >
                      {c}
                    </button>
                  </span>
                )
              })}
            </div>
          )}

          {currentPath === null && (
            <div className="breadcrumbs">
              <span className="crumb-sep" style={{ color: 'var(--text-muted)' }}>Discos</span>
            </div>
          )}

          {error && <div className="alert alert-error">{error}</div>}

          {loading ? (
            <div className="muted">Cargando...</div>
          ) : entries.length === 0 ? (
            <div className="muted">No hay subcarpetas.</div>
          ) : (
            <div className="fs-list">
              {entries.map((entry) => (
                <button
                  key={entry.path}
                  type="button"
                  className="fs-item"
                  onClick={() => navigateInto(entry.path)}
                >
                  <span className="fs-icon">📁</span>
                  <span className="fs-name">{entry.name}</span>
                  <span className="fs-arrow">›</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="modal-footer">
          {currentPath !== null && (
            <button type="button" className="btn btn-primary" onClick={() => onSelect(currentPath)}>
              Usar esta carpeta
            </button>
          )}
        </div>
      </div>
    </div>
  )
}