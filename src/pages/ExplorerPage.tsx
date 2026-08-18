import { useCallback, useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api, ApiClientError } from '../lib/api'
import type { ExplorerNode, PlaylistSummaryDto } from '../types'

export function ExplorerPage() {
  const [nodes, setNodes] = useState<ExplorerNode[]>([])
  const [currentPath, setCurrentPath] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [playlists, setPlaylists] = useState<PlaylistSummaryDto[]>([])
  const [menuFor, setMenuFor] = useState<string | null>(null)
  const [feedback, setFeedback] = useState('')
  const navigate = useNavigate()

  const load = useCallback(async (path: string | null) => {
    setLoading(true)
    setError('')
    try {
      const list = await api.get<ExplorerNode[]>('/explorer', {
        query: path ? { path } : {},
      })
      setNodes(list)
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Error al explorar')
      setNodes([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load(currentPath)
  }, [currentPath, load])

  const loadPlaylists = useCallback(async () => {
    try {
      setPlaylists(await api.get<PlaylistSummaryDto[]>('/playlists'))
    } catch {
      setPlaylists([])
    }
  }, [])

  useEffect(() => {
    void loadPlaylists()
  }, [loadPlaylists])

  const play = (node: ExplorerNode) => {
    if (!node.playable || !node.streamUrl) return
    navigate(
      `/player?src=${encodeURIComponent(node.streamUrl)}&title=${encodeURIComponent(node.name)}&type=${node.mediaType}&path=${encodeURIComponent(node.path)}`,
    )
  }

  const openFolder = (node: ExplorerNode) => {
    setCurrentPath(node.path)
  }

  const addFavorite = async (node: ExplorerNode) => {
    setFeedback('')
    try {
      await api.post('/favorites', { path: node.path })
      setFeedback(`${node.name} agregado a favoritos`)
    } catch (err) {
      setFeedback(err instanceof ApiClientError ? err.message : 'Error al agregar a favoritos')
    }
  }

  const toggleMenu = (node: ExplorerNode) => {
    setMenuFor((prev) => (prev === node.path ? null : node.path))
  }

  const addToPlaylist = async (playlistId: number, node: ExplorerNode) => {
    setFeedback('')
    setMenuFor(null)
    try {
      await api.post(`/playlists/${playlistId}/items`, { path: node.path })
      const pl = playlists.find((p) => p.id === playlistId)
      setFeedback(`${node.name} agregado a "${pl?.name ?? ''}"`)
    } catch (err) {
      setFeedback(err instanceof ApiClientError ? err.message : 'Error al agregar a la playlist')
    }
  }

  const crumbs = currentPath?.split('/').filter(Boolean) ?? []

  return (
    <div className="page">
      <header className="page-header">
        <h1>Explorador</h1>
      </header>

      {crumbs.length > 0 && (
        <div className="breadcrumbs">
          <button type="button" className="crumb" onClick={() => setCurrentPath(null)}>
            Inicio
          </button>
          {crumbs.map((c, i) => {
            const partial = crumbs.slice(0, i + 1).join('/')
            const full = i === crumbs.length - 1 ? currentPath : partial
            return (
              <span key={full}>
                <span className="crumb-sep">/</span>
                <button type="button" className="crumb" onClick={() => setCurrentPath(full)}>
                  {c}
                </button>
              </span>
            )
          })}
        </div>
      )}

      {feedback && <div className={`alert ${feedback.toLowerCase().includes('error') ? 'alert-error' : 'alert-info'}`}>{feedback}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="muted">Cargando...</div>
      ) : nodes.length === 0 && crumbs.length === 0 ? (
        <div className="empty">
          <p>No configuraste ninguna carpeta todavía.</p>
          <p className="muted">Agregá una raíz para empezar a explorar tu contenido.</p>
          <Link to="/raices" className="btn btn-primary" style={{ display: 'inline-block', marginTop: 12 }}>
            Configurar mis raíces
          </Link>
        </div>
      ) : nodes.length === 0 ? (
        <div className="empty">
          <p>Esta carpeta está vacía.</p>
        </div>
      ) : (
        <div className="grid">
          {nodes.map((node) => (
            <div key={node.path} className={`card-wrap${node.playable ? ' card-wrap-playable' : ''}`}>
              <button
                type="button"
                className={`card ${node.playable ? 'card-playable' : ''}`}
                onClick={() => (node.directory ? openFolder(node) : play(node))}
              >
                <div className="card-icon">
                  {node.directory ? '📁' : node.mediaType === 'AUDIO' ? '🎵' : node.mediaType === 'VIDEO' ? '🎬' : '📄'}
                </div>
                <div className="card-title" title={node.name}>
                  {node.name}
                </div>
                {node.playable && <div className="card-badge">{node.mediaType === 'AUDIO' ? 'Audio' : 'Video'}</div>}
              </button>
              {node.playable && (
                <div className="card-actions">
                  <button type="button" className="btn btn-sm" title="Agregar a favoritos" onClick={() => void addFavorite(node)}>
                    ♥ Favorito
                  </button>
                  <div className="menu-wrap">
                    <button type="button" className="btn btn-sm" onClick={() => toggleMenu(node)}>
                      ＋ Playlist
                    </button>
                    {menuFor === node.path && (
                      <div className="menu">
                        {playlists.length === 0 ? (
                          <div className="menu-empty">
                            No tenés playlists. <Link to="/playlists">Crear una</Link>
                          </div>
                        ) : (
                          playlists.map((pl) => (
                            <button key={pl.id} type="button" className="menu-item" onClick={() => void addToPlaylist(pl.id, node)}>
                              {pl.name}
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}