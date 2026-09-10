import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { explorerService } from '../services/explorer'
import { rootsService } from '../services/roots'
import { ApiClientError } from '../lib/api'
import { titleDetailsService } from '../services/title-details'
import { PosterPickerModal } from '../components/PosterPickerModal'
import type { ExplorerNode } from '../types'

function cleanDisplayName(raw: string): string {
  let n = raw.replace(/\.[a-z0-9]+$/i, '').trim()
  n = n.replace(/[-_][A-Za-z0-9]+$/, '')
  const yearIdx = n.search(/\b(?:19|20)\d{2}\b/)
  if (yearIdx !== -1) n = n.substring(0, yearIdx)
  else {
    n = n.replace(/\b\d{3,4}p\b/gi, ' ')
    n = n.replace(/\b(?:x264|x265|H\.?264|HEVC|AVC)\b/gi, ' ')
    n = n.replace(/\b(?:WEBRip|WEB-DL|BluRay|BRRip|DVDRip|HDR|HDTV)\b/gi, ' ')
  }
  n = n.replace(/[\[\]()]/g, ' ').replace(/[._-]/g, ' ').replace(/\s+/g, ' ').trim()
  if (n.length > 35 && !n.includes(' ') && /^[A-Za-z0-9+/=]+$/.test(n)) return raw
  return n || raw
}

export function ExplorerPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [nodes, setNodes] = useState<ExplorerNode[]>([])
  const [configuredRoots, setConfiguredRoots] = useState<string[]>([])
  const [currentPath, setCurrentPath] = useState<string | null>(() => searchParams.get('path'))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerQuery, setPickerQuery] = useState('')
  const [pickerNode, setPickerNode] = useState<ExplorerNode | null>(null)
  const fetchedPosters = useRef<Set<string>>(new Set())
  const navigate = useNavigate()

  const setPath = useCallback(
    (path: string | null) => {
      setCurrentPath(path)
      if (path) setSearchParams({ path })
      else setSearchParams({})
    },
    [setSearchParams],
  )

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
    const urlPath = searchParams.get('path')
    if (urlPath !== currentPath) setCurrentPath(urlPath)
  }, [searchParams])

  useEffect(() => {
    fetchedPosters.current.clear()
    void load(currentPath)
  }, [currentPath, load])

  useEffect(() => {
    void rootsService.list().then(setConfiguredRoots).catch(() => setConfiguredRoots([]))
  }, [])

  // Carga automática de posters + metadatos sin sobrescribir selecciones manuales existentes.
  useEffect(() => {
    const toFetch = nodes.filter(
      (n) => n.playable && (!n.posterUrl || !n.year || !n.genres || n.voteAverage == null || !n.mediaTypeDetail) && !fetchedPosters.current.has(n.path),
    )
    if (toFetch.length === 0) return
    const batch = toFetch.slice(0, 6)
    batch.forEach((n) => fetchedPosters.current.add(n.path))
    batch.forEach(async (node) => {
      try {
        const res = await titleDetailsService.search(node.name)
        if (res) {
          const hasData = res.year || res.genres || res.voteAverage != null || res.mediaType
          if (hasData) {
            setNodes((prev) =>
              prev.map((x) =>
                x.path === node.path
                  ? {
                      ...x,
                      posterUrl: x.posterUrl ?? res.posterUrl,
                      year: res.year ?? x.year,
                      genres: res.genres ?? x.genres,
                      voteAverage: res.voteAverage ?? x.voteAverage,
                      mediaTypeDetail: res.mediaType ?? x.mediaTypeDetail,
                    }
                  : x,
              ),
            )
            titleDetailsService.savePoster(node.path, res).catch(() => {})
          }
        }
      } catch {}
    })
  }, [nodes])

  const openDetail = (node: ExplorerNode) => {
    if (!node.playable) return
    navigate(
      `/detalle?path=${encodeURIComponent(node.path)}&name=${encodeURIComponent(node.name)}&type=${encodeURIComponent(node.mediaType ?? '')}&streamUrl=${encodeURIComponent(node.streamUrl ?? '')}&posterUrl=${encodeURIComponent(node.posterUrl ?? '')}`,
    )
  }

  const openFolder = (node: ExplorerNode) => {
    setPath(node.path)
  }

  const normalizePath = (path: string) => path.replace(/[\\/]+/g, '/').replace(/\/$/, '').toLowerCase()

  const configuredRoot = currentPath
    ? configuredRoots
        .filter((root) => {
          const normalizedRoot = normalizePath(root)
          const normalizedCurrent = normalizePath(currentPath)
          return normalizedCurrent === normalizedRoot || normalizedCurrent.startsWith(`${normalizedRoot}/`)
        })
        .sort((a, b) => normalizePath(b).length - normalizePath(a).length)[0]
    : undefined

  const goBack = () => {
    if (!currentPath) return
    if (configuredRoot && normalizePath(currentPath) === normalizePath(configuredRoot)) {
      setPath(null)
      return
    }
    const parent = currentPath.replace(/[\\/][^\\/]+[\\/]?$/, '') || null
    setPath(parent && configuredRoot && normalizePath(parent).length < normalizePath(configuredRoot).length ? configuredRoot : parent)
  }

  const separator = currentPath?.includes('\\') ? '\\' : '/'
  const relativeSegments = configuredRoot && currentPath
    ? normalizePath(currentPath).slice(normalizePath(configuredRoot).length).split('/').filter(Boolean)
    : []
  const rootLabel = configuredRoot?.split(/[\\/]+/).filter(Boolean).at(-1)
  const crumbs = configuredRoot && rootLabel
    ? [
        { label: rootLabel, path: configuredRoot },
        ...relativeSegments.map((_, index) => ({
          label: currentPath!.split(/[\\/]+/).filter(Boolean).slice(-relativeSegments.length)[index],
          path: `${configuredRoot.replace(/[\\/]$/, '')}${separator}${relativeSegments.slice(0, index + 1).join(separator)}`,
        })),
      ]
    : []

  return (
    <div className="page">
      <header className="page-header">
        <h1>Explorador</h1>
      </header>

      {crumbs.length > 0 && (
        <div className="breadcrumbs">
          <button type="button" className="crumb" onClick={goBack}>
            ← Atrás
          </button>
          <button type="button" className="crumb" onClick={() => setPath(null)}>
            Inicio
          </button>
          {crumbs.map((crumb) => {
            return (
              <span key={crumb.path}>
                <span className="crumb-sep">/</span>
                <button type="button" className="crumb" onClick={() => setPath(crumb.path)}>
                  {crumb.label}
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
            <div key={node.path} className="card-wrap">
                <button
                  type="button"
                  className={`card ${node.playable ? 'card-playable' : ''}`}
                  onClick={() => (node.directory ? openFolder(node) : openDetail(node))}
                >
                  {node.playable && (
                    <span className="detail-badge type-badge">
                      {node.mediaTypeDetail === 'movie'
                        ? 'Película'
                        : node.mediaTypeDetail === 'series'
                          ? 'Serie'
                          : node.mediaType === 'AUDIO'
                            ? 'Audio'
                            : node.mediaType === 'VIDEO'
                              ? 'Película'
                              : 'Otro'}
                    </span>
                  )}
                  {node.posterUrl ? (
                    <>
                      <img src={node.posterUrl} alt={node.name} className="card-poster" loading="lazy" />
                      <div className="card-overlay">
                        <div className="card-overlay-meta">
                          {node.genres && <div className="card-overlay-genres">{node.genres.split(',').slice(0, 2).join(' · ')}</div>}
                          <div className="card-overlay-year">
                            {node.year && <span>{node.year}</span>}
                            {node.voteAverage != null && (
                              <span className="card-stars">
                                {' '}
                                {'★'.repeat(Math.round(node.voteAverage / 2)) + '☆'.repeat(5 - Math.round(node.voteAverage / 2))} {node.voteAverage.toFixed(1)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="card-icon">
                      {node.directory ? '📁' : node.mediaType === 'AUDIO' ? '🎵' : node.mediaType === 'VIDEO' ? '🎬' : '📄'}
                    </div>
                  )}
                <div
                  className="card-title"
                  title={node.name}
                  style={node.playable ? { cursor: 'pointer' } : undefined}
                >
                  {node.directory ? node.name : cleanDisplayName(node.name)}
                </div>
                {node.playable && (
                  <div className="card-badge">
                    {node.year && node.voteAverage != null
                      ? `${node.year} · ${'★'.repeat(Math.round(node.voteAverage / 2))}${'☆'.repeat(5 - Math.round(node.voteAverage / 2))} ${node.voteAverage.toFixed(1)}`
                      : node.voteAverage != null
                        ? `${'★'.repeat(Math.round(node.voteAverage / 2))}${'☆'.repeat(5 - Math.round(node.voteAverage / 2))} ${node.voteAverage.toFixed(1)}`
                        : node.year
                          ? String(node.year)
                          : node.mediaType === 'AUDIO'
                            ? 'Audio'
                            : 'Video'}
                  </div>
                )}
              </button>
              {node.playable && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  style={{ width: '100%', marginTop: 4, fontSize: 11 }}
                  onClick={() => {
                    setPickerNode(node)
                    setPickerQuery(node.name)
                    setPickerOpen(true)
                  }}
                >
                  🖼 Cambiar poster
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {pickerOpen && pickerNode && (
        <PosterPickerModal
          isOpen={pickerOpen}
          onClose={() => setPickerOpen(false)}
          query={pickerQuery}
          onSelect={async (selected) => {
            try {
              await titleDetailsService.savePoster(pickerNode.path, selected)
              setNodes((prev) =>
                prev.map((x) =>
                  x.path === pickerNode.path
                    ? {
                        ...x,
                        posterUrl: selected.posterUrl ?? x.posterUrl,
                        year: selected.year ?? x.year,
                        genres: selected.genres ?? x.genres,
                        voteAverage: selected.voteAverage ?? x.voteAverage,
                        mediaTypeDetail: selected.mediaType ?? x.mediaTypeDetail,
                      }
                    : x,
                ),
              )
              setFeedback(`Poster actualizado para "${cleanDisplayName(pickerNode.name)}"`)
            } catch {
              setFeedback('No se pudo guardar el póster')
            } finally {
              setPickerOpen(false)
            }
          }}
        />
      )}
    </div>
  )
}
