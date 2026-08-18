import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { playlistsService } from '../services/playlists'
import { ApiClientError } from '../lib/api'
import type { PlaylistDto, PlaylistSummaryDto } from '../types'

export function PlaylistsPage() {
  const [playlists, setPlaylists] = useState<PlaylistSummaryDto[]>([])
  const [detail, setDetail] = useState<PlaylistDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [newName, setNewName] = useState('')
  const [renameName, setRenameName] = useState('')
  const [itemPath, setItemPath] = useState('')
  const navigate = useNavigate()

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setPlaylists(await playlistsService.list())
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Error al cargar playlists')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadDetail = useCallback(async (id: number) => {
    setError('')
    try {
      setDetail(await playlistsService.get(id))
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Error al cargar la playlist')
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const create = async () => {
    if (!newName.trim()) return
    try {
      const created = await playlistsService.create(newName.trim())
      setNewName('')
      await load()
      setDetail(created)
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Error al crear playlist')
    }
  }

  const rename = async () => {
    if (!detail || !renameName.trim()) return
    try {
      await playlistsService.rename(detail.id, renameName.trim())
      setRenameName('')
      await Promise.all([load(), loadDetail(detail.id)])
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Error al renombrar')
    }
  }

  const removePlaylist = async () => {
    if (!detail) return
    try {
      await playlistsService.remove(detail.id)
      setDetail(null)
      await load()
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Error al eliminar playlist')
    }
  }

  const addItem = async () => {
    if (!detail || !itemPath.trim()) return
    try {
      await playlistsService.addItem(detail.id, itemPath.trim())
      setItemPath('')
      await Promise.all([load(), loadDetail(detail.id)])
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Error al agregar item')
    }
  }

  const removeItem = async (path: string) => {
    if (!detail) return
    try {
      await playlistsService.removeItem(detail.id, path)
      await Promise.all([load(), loadDetail(detail.id)])
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Error al quitar item')
    }
  }

  const play = (streamUrl: string, title: string, mediaType: string, path: string) => {
    navigate(`/player?src=${encodeURIComponent(streamUrl)}&title=${encodeURIComponent(title)}&type=${mediaType}&path=${encodeURIComponent(path)}`)
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>Playlists</h1>
      </header>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="create-bar">
        <input
          className="input"
          placeholder="Nombre de la nueva playlist"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void create()}
        />
        <button type="button" className="btn btn-primary" onClick={() => void create()} disabled={!newName.trim()}>
          Crear
        </button>
      </div>

      {loading ? (
        <div className="muted">Cargando...</div>
      ) : playlists.length === 0 ? (
        <div className="empty">
          <p>No tenés playlists.</p>
          <p className="muted">Creá una para agrupar tu contenido.</p>
        </div>
      ) : (
        <div className="list">
          {playlists.map((p) => (
            <div key={p.id} className={`list-row${detail?.id === p.id ? ' selected' : ''}`}>
              <button type="button" className="list-row-main" onClick={() => void loadDetail(p.id)}>
                <span className="list-icon">🎧</span>
                <span className="list-title">{p.name}</span>
                <span className="list-meta">{p.itemCount} items</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {detail && (
        <section className="panel">
          <div className="panel-head">
            <h2>{detail.name}</h2>
            <div className="panel-actions">
              <input
                className="input"
                placeholder="Nuevo nombre"
                value={renameName}
                onChange={(e) => setRenameName(e.target.value)}
              />
              <button type="button" className="btn btn-ghost" onClick={() => void rename()} disabled={!renameName.trim()}>
                Renombrar
              </button>
              <button type="button" className="btn btn-danger" onClick={() => void removePlaylist()}>
                Eliminar
              </button>
            </div>
          </div>

          <div className="create-bar">
            <input
              className="input"
              placeholder="Path del archivo (ej: D:/media/peliculas/ejemplo.mp4)"
              value={itemPath}
              onChange={(e) => setItemPath(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void addItem()}
            />
            <button type="button" className="btn btn-primary" onClick={() => void addItem()} disabled={!itemPath.trim()}>
              Agregar
            </button>
          </div>

          {detail.items.length === 0 ? (
            <p className="muted">Playlist vacía.</p>
          ) : (
            <div className="list">
              {detail.items.map((item) => (
                <div key={item.id} className="list-row">
                  <button
                    type="button"
                    className="list-row-main"
                    onClick={() => play(item.streamUrl, item.title, item.mediaType, item.path)}
                  >
                    <span className="list-icon">{item.mediaType === 'AUDIO' ? '🎵' : '🎬'}</span>
                    <span className="list-title">{item.title}</span>
                    <span className="list-meta">{item.contentType}</span>
                  </button>
                  <button type="button" className="btn btn-danger" onClick={() => void removeItem(item.path)}>
                    Quitar
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  )
}