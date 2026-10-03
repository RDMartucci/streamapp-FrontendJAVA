import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiClientError, resolveServerUrl } from '../lib/api'
import { libraryService } from '../services/library'
import { titleDetailsService } from '../services/title-details'
import type { MediaItemDto } from '../types'

function displayTitle(item: MediaItemDto): string {
  return item.title || item.path.split(/[\\/]/).pop() || item.path
}

export function LibraryPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState<MediaItemDto[]>([])
  const [page, setPage] = useState(0)
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [movieCount, setMovieCount] = useState(0)
  const [seriesCount, setSeriesCount] = useState(0)
  const [audioCount, setAudioCount] = useState(0)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'movie' | 'series' | 'audio'>('all')
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')
  const fetchedPosters = useRef<Set<number>>(new Set())
  const posterBatchInProgress = useRef(false)
  const [posterBatchVersion, setPosterBatchVersion] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const result = await libraryService.list(page, 24, query, filter)
      setItems(result.items)
      setTotalItems(result.totalItems)
      setTotalPages(result.totalPages)
      setMovieCount(result.movieCount)
      setSeriesCount(result.seriesCount)
      setAudioCount(result.audioCount)
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'No se pudo cargar la biblioteca')
    } finally {
      setLoading(false)
    }
  }, [page, query, filter])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (posterBatchInProgress.current) return
    const toFetch = items.filter(
      (item) => item.mediaType === 'VIDEO' && !item.posterUrl && !fetchedPosters.current.has(item.id),
    )
    const batch = toFetch.slice(0, 6)
    if (batch.length === 0) return
    posterBatchInProgress.current = true
    batch.forEach((item) => fetchedPosters.current.add(item.id))
    void Promise.all(batch.map(async (item) => {
      try {
        const detail = await titleDetailsService.search(item.title, item.path)
        if (!detail?.posterUrl) return
        await titleDetailsService.savePoster(item.path, detail)
        setItems((current) => current.map((entry) =>
          entry.id === item.id ? { ...entry, posterUrl: detail.posterUrl } : entry,
        ))
      } catch {}
    })).finally(() => {
      posterBatchInProgress.current = false
      setPosterBatchVersion((version) => version + 1)
    })
  }, [items, posterBatchVersion])

  const scan = async () => {
    setScanning(true)
    setError('')
    setFeedback('')
    try {
      const result = await libraryService.scan()
      setFeedback(`Biblioteca actualizada: ${result.indexed} nuevos, ${result.updated} actualizados.`)
      setPage(0)
      await load()
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'No se pudo escanear la biblioteca')
    } finally {
      setScanning(false)
    }
  }

  const openItem = (item: MediaItemDto) => {
    navigate(
      `/detalle?path=${encodeURIComponent(item.path)}&name=${encodeURIComponent(displayTitle(item))}` +
      `&type=${encodeURIComponent(item.mediaType)}&streamUrl=${encodeURIComponent(item.streamUrl)}` +
      `&mediaTypeDetail=${encodeURIComponent(item.mediaTypeDetail ?? '')}` +
      `&posterUrl=${encodeURIComponent(item.posterUrl ?? '')}`,
    )
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <div className="eyebrow">STREAMAPP MEDIA SERVER</div>
          <h1>Mi biblioteca</h1>
          <div className="muted">{totalItems} elementos catalogados para reproducir</div>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => void scan()} disabled={scanning}>
          {scanning ? 'Escaneando...' : 'Actualizar biblioteca'}
        </button>
      </header>

      <section className="library-hero">
        <div>
          <h2>Todo tu contenido, en un solo lugar</h2>
          <p className="muted">
            Explora películas, series y audio desde cualquier cliente conectado a tu servidor.
          </p>
        </div>
        <div className="library-stats">
          <div><strong>{movieCount}</strong><span>Películas</span></div>
          <div><strong>{seriesCount}</strong><span>Series</span></div>
          <div><strong>{audioCount}</strong><span>Audio</span></div>
        </div>
      </section>

      <div className="library-toolbar">
        <input
          className="input"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar películas, series o archivos..."
          aria-label="Buscar en la biblioteca"
        />
        <select className="input library-filter" value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)}>
          <option value="all">Todo</option>
          <option value="movie">Películas</option>
          <option value="series">Series</option>
          <option value="audio">Audio</option>
        </select>
      </div>

      {feedback && <div className="alert alert-info">{feedback}</div>}
      {error && <div className="alert alert-error">{error}</div>}
      {loading ? (
        <div className="muted">Cargando biblioteca...</div>
      ) : items.length === 0 ? (
        <div className="empty">
          <p>{items.length === 0 ? 'Tu biblioteca todavía está vacía.' : 'No hay resultados para esa búsqueda.'}</p>
          {totalItems === 0 && <p className="muted">Configura una raíz y pulsa «Actualizar biblioteca».</p>}
        </div>
      ) : (
        <div className="grid">
          {items.map((item) => (
            <button type="button" className="card card-playable" key={item.id} onClick={() => openItem(item)}>
              {item.posterUrl ? (
                <img src={resolveServerUrl(item.posterUrl)} alt={displayTitle(item)} className="card-poster" loading="lazy" />
              ) : (
                <div className="card-icon">{item.mediaType === 'AUDIO' ? '🎵' : '🎬'}</div>
              )}
              <div className="card-title" title={displayTitle(item)}>{displayTitle(item)}</div>
              <div className="card-badge">
                {item.mediaType === 'AUDIO' ? 'Audio' : item.mediaTypeDetail === 'series' ? 'Serie' : 'Película'}
              </div>
            </button>
          ))}
        </div>
      )}
      {!loading && totalPages > 1 && (
        <div className="library-pagination">
          <button type="button" className="btn btn-ghost" disabled={page === 0} onClick={() => setPage((value) => value - 1)}>
            Anterior
          </button>
          <span className="muted">Página {page + 1} de {totalPages}</span>
          <button type="button" className="btn btn-ghost" disabled={page + 1 >= totalPages} onClick={() => setPage((value) => value + 1)}>
            Siguiente
          </button>
        </div>
      )}
    </div>
  )
}
