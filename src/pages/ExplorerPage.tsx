import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { explorerService } from '../services/explorer'
import { favoritesService } from '../services/favorites'
import { playlistsService } from '../services/playlists'
import { ApiClientError } from '../lib/api'
import { titleDetailsService, type TitleDetail } from '../services/title-details'
import { TitleDetailsModal } from '../components/TitleDetailsModal'
import type { ExplorerNode, PlaylistSummaryDto } from '../types'

export function ExplorerPage() {
  const [nodes, setNodes] = useState<ExplorerNode[]>([])
  const [currentPath, setCurrentPath] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [playlists, setPlaylists] = useState<PlaylistSummaryDto[]>([])
  const [menuFor, setMenuFor] = useState<string | null>(null)
  const [feedback, setFeedback] = useState('')
  const [showDetails, setShowDetails] = useState(false)
  const [detail, setDetail] = useState<TitleDetail | null>(null)
  const fetchedPosters = useRef<Set<string>>(new Set())
  const navigate = useNavigate()

  const load = useCallback(async (path: string | null) => {
    setLoading(true)
    setError('')
    try {
      const list = await explorerService.list(path ?? undefined)
      setNodes(list)
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Error al explorar')
      setNodes([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchedPosters.current.clear()
    void load(currentPath)
  }, [currentPath, load])

  // Carga automática de posters: al listar, busca en TMDB los que aún no tienen posterUrl
  useEffect(() => {
    const toFetch = nodes.filter((n) => n.playable && !n.posterUrl && !fetchedPosters.current.has(n.path))
    if (toFetch.length === 0) return
    toFetch.forEach((n) => fetchedPosters.current.add(n.path))
    // Lanza en paralelo con límite simple (máx 6 a la vez para no saturar TMDB)
    const batch = toFetch.slice(0, 6)
    batch.forEach(async (node) => {
      try {
        const res = await titleDetailsService.search(node.name)
        if (res?.posterUrl) {
          setNodes((prev) => prev.map((x) => (x.path === node.path ? { ...x, posterUrl: res.posterUrl } : x)))
          titleDetailsService.savePoster(node.path, res.posterUrl).catch(() => {})
        }
      } catch {
        // ignora: 204 o error de red ya manejado, no ensucia consola
      }
    })
  }, [nodes])

  const loadPlaylists = useCallback(async () => {
    try {
      setPlaylists(await playlistsService.list())
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
      await favoritesService.add(node.path)
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
      await playlistsService.addItem(playlistId, node.path)
      const pl = playlists.find((p) => p.id === playlistId)
      setFeedback(`${node.name} agregado a "${pl?.name ?? ''}"`)
    } catch (err) {
      setFeedback(err instanceof ApiClientError ? err.message : 'Error al agregar a la playlist')
    }
  }

  const handleInfoClick = useCallback(async (node: ExplorerNode) => {
    try {
      const res = await titleDetailsService.search(node.name)
      if (res) {
        setDetail(res)
        setShowDetails(true)
        if (res.posterUrl) {
          setNodes((prev) => prev.map((n) => (n.path === node.path ? { ...n, posterUrl: res.posterUrl } : n)))
          titleDetailsService.savePoster(node.path, res.posterUrl).catch(() => {})
        }
      } else {
        setFeedback('No se encontró info en TMDB para ese título')
      }
    } catch {
      setFeedback('Error al consultar TMDB')
    }
  }, [])

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
                {node.posterUrl ? (
                  <img src={node.posterUrl} alt={node.name} className="card-poster" loading="lazy" />
                ) : (
                  <div className="card-icon">
                    {node.directory ? '📁' : node.mediaType === 'AUDIO' ? '🎵' : node.mediaType === 'VIDEO' ? '🎬' : '📄'}
                  </div>
                )}
                <div
                  className="card-title"
                  title={node.name}
                  onClick={(e) => {
                    if (node.playable) {
                      e.stopPropagation()
                      void handleInfoClick(node)
                    }
                  }}
                  style={node.playable ? { cursor: 'pointer', textDecoration: 'underline' } : undefined}
                >
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
                  <button type="button" className="btn btn-sm btn-ghost" onClick={() => void handleInfoClick(node)}>
                    ℹ Info
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      {showDetails && detail && (
        <TitleDetailsModal isOpen={showDetails} onClose={() => setShowDetails(false)} detail={detail} />
      )}
    </div>
  )
}