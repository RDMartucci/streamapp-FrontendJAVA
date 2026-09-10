import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiClientError } from '../lib/api'
import { libraryService } from '../services/library'
import type { MediaItemDto } from '../types'

function displayTitle(item: MediaItemDto): string {
  return item.title || item.path.split(/[\\/]/).pop() || item.path
}

export function LibraryPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState<MediaItemDto[]>([])
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'movie' | 'series' | 'audio'>('all')
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setItems(await libraryService.list())
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'No se pudo cargar la biblioteca')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase()
    if (!normalized) return items
    return items.filter((item) => {
      const matchesQuery = `${displayTitle(item)} ${item.path}`.toLocaleLowerCase().includes(normalized)
      const matchesFilter = filter === 'all' ||
        (filter === 'audio' ? item.mediaType === 'AUDIO' : item.mediaTypeDetail === filter)
      return matchesQuery && matchesFilter
    })
  }, [items, query, filter])

  const scan = async () => {
    setScanning(true)
    setError('')
    setFeedback('')
    try {
      const result = await libraryService.scan()
      setFeedback(`Biblioteca actualizada: ${result.indexed} nuevos, ${result.updated} actualizados.`)
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
      `&posterUrl=${encodeURIComponent(item.posterUrl ?? '')}`,
    )
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <div className="eyebrow">STREAMAPP MEDIA SERVER</div>
          <h1>Mi biblioteca</h1>
          <div className="muted">{items.length} elementos catalogados para reproducir</div>
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
          <div><strong>{items.filter((item) => item.mediaTypeDetail === 'movie').length}</strong><span>Películas</span></div>
          <div><strong>{items.filter((item) => item.mediaTypeDetail === 'series').length}</strong><span>Series</span></div>
          <div><strong>{items.filter((item) => item.mediaType === 'AUDIO').length}</strong><span>Audio</span></div>
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
      ) : filteredItems.length === 0 ? (
        <div className="empty">
          <p>{items.length === 0 ? 'Tu biblioteca todavía está vacía.' : 'No hay resultados para esa búsqueda.'}</p>
          {items.length === 0 && <p className="muted">Configura una raíz y pulsa «Actualizar biblioteca».</p>}
        </div>
      ) : (
        <div className="grid">
          {filteredItems.map((item) => (
            <button type="button" className="card card-playable" key={item.id} onClick={() => openItem(item)}>
              {item.posterUrl ? (
                <img src={item.posterUrl} alt={displayTitle(item)} className="card-poster" loading="lazy" />
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
    </div>
  )
}
