import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { ApiClientError } from '../lib/api'
import { useAuth } from '../lib/auth'
import { libraryService } from '../services/library'
import { titleDetailsService } from '../services/title-details'
import { PosterPickerModal } from '../components/PosterPickerModal'
import { MediaCard } from '../components/MediaCard'
import type { MediaItemDto } from '../types'

function displayTitle(item: MediaItemDto): string {
  return item.title || item.path.split(/[\\/]/).pop() || item.path
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds} s`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return remainingSeconds === 0 ? `${minutes} min` : `${minutes} min ${remainingSeconds} s`
}

export function LibraryPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user } = useAuth()
  const [items, setItems] = useState<MediaItemDto[]>([])
  const [page, setPage] = useState(() => {
    const value = Number(searchParams.get('page'))
    return Number.isInteger(value) && value > 0 ? value : 0
  })
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [movieCount, setMovieCount] = useState(0)
  const [seriesCount, setSeriesCount] = useState(0)
  const [audioCount, setAudioCount] = useState(0)
  const [query, setQuery] = useState(() => searchParams.get('query') ?? '')
  const [actor, setActor] = useState(() => searchParams.get('actor') ?? '')
  const [director, setDirector] = useState(() => searchParams.get('director') ?? '')
  const [year, setYear] = useState(() => searchParams.get('year') ?? '')
  const [genre, setGenre] = useState(() => searchParams.get('genre') ?? '')
  const [stars, setStars] = useState(() => searchParams.get('stars') ?? '')
  const [filter, setFilter] = useState<'all' | 'movie' | 'series' | 'audio'>(() => {
    const value = searchParams.get('filter')
    return value === 'movie' || value === 'series' || value === 'audio' ? value : 'all'
  })
  const [filterOptions, setFilterOptions] = useState({
    actors: [] as string[],
    directors: [] as string[],
    years: [] as number[],
    genres: [] as string[],
    stars: [] as number[],
  })
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [scanCanceling, setScanCanceling] = useState(false)
  const scanCancellationRequested = useRef(false)
  const scanRequestActive = useRef(false)
  const [scanStartedAt, setScanStartedAt] = useState<number | null>(null)
  const [scanElapsedSeconds, setScanElapsedSeconds] = useState(0)
  const [scanEtaSeconds, setScanEtaSeconds] = useState<number | null>(null)
  const [scanEstimateTitles, setScanEstimateTitles] = useState(0)
  const [scanRateMsPerTitle, setScanRateMsPerTitle] = useState<number | null>(() => {
    try {
      const savedRate = Number(localStorage.getItem(`streamapp-library-scan-rate:${user?.username ?? 'default'}`))
      return Number.isFinite(savedRate) && savedRate > 0 ? savedRate : null
    } catch {
      return null
    }
  })
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')
  const [pickerItem, setPickerItem] = useState<MediaItemDto | null>(null)
  const [filterOptionsError, setFilterOptionsError] = useState('')
  const scrollRestored = useRef(false)

  useEffect(() => {
    const params = new URLSearchParams()
    if (page > 0) params.set('page', String(page))
    if (query) params.set('query', query)
    if (filter !== 'all') params.set('filter', filter)
    if (actor) params.set('actor', actor)
    if (director) params.set('director', director)
    if (year) params.set('year', year)
    if (genre) params.set('genre', genre)
    if (stars) params.set('stars', stars)
    if (params.toString() !== searchParams.toString()) {
      setSearchParams(params, { replace: true, state: location.state })
    }
  }, [page, query, filter, actor, director, year, genre, stars, searchParams, setSearchParams, location.state])

  const restoreScrollY = (location.state as { restoreScrollY?: number } | null)?.restoreScrollY
  useEffect(() => {
    if (loading || restoreScrollY == null || scrollRestored.current) return
    scrollRestored.current = true
    window.requestAnimationFrame(() => window.scrollTo(0, restoreScrollY))
  }, [loading, restoreScrollY])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const result = await libraryService.list(page, 24, query, filter, {
        actor,
        director,
        year,
        genre,
        stars,
      })
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
  }, [page, query, actor, director, year, genre, stars, filter])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    void libraryService.filterOptions()
      .then((options) => {
        setFilterOptions(options)
        setFilterOptionsError('')
      })
      .catch((err) => setFilterOptionsError(
        err instanceof ApiClientError ? err.message : 'No se pudieron cargar las opciones de búsqueda',
      ))
  }, [])

  useEffect(() => {
    if (scanStartedAt === null) return
    const updateElapsed = () => setScanElapsedSeconds(Math.floor((Date.now() - scanStartedAt) / 1000))
    updateElapsed()
    const timer = window.setInterval(updateElapsed, 1000)
    return () => window.clearInterval(timer)
  }, [scanStartedAt])

  const scan = async () => {
    setScanning(true)
    setScanCanceling(false)
    scanCancellationRequested.current = false
    scanRequestActive.current = false
    setScanStartedAt(Date.now())
    setScanElapsedSeconds(0)
    setScanEtaSeconds(null)
    setScanEstimateTitles(0)
    setError('')
    setFeedback('')
    try {
      let catalogTitles: number | null = null
      try {
        const catalog = await libraryService.list(0, 1)
        catalogTitles = catalog.totalItems
      } catch {
        setScanEstimateTitles(0)
      }
      if (catalogTitles !== null) setScanEstimateTitles(catalogTitles)
      if (scanCancellationRequested.current) {
        setFeedback('Actualización cancelada antes de iniciar el escaneo.')
        return
      }
      if (scanRateMsPerTitle != null && catalogTitles !== null && catalogTitles > 0) {
        setScanEtaSeconds(Math.ceil((scanRateMsPerTitle * catalogTitles) / 1000))
      }

      const startedAt = Date.now()
      scanRequestActive.current = true
      const result = await libraryService.scan()
      scanRequestActive.current = false
      const durationMs = Date.now() - startedAt
      const scannedTitles = result.indexed + result.updated
      let historySaveFailed = false
      if (!result.cancelled && scannedTitles > 0) {
        const measuredRate = durationMs / scannedTitles
        const updatedRate = scanRateMsPerTitle == null
          ? measuredRate
          : (scanRateMsPerTitle + measuredRate) / 2
        setScanRateMsPerTitle(updatedRate)
        try {
          localStorage.setItem(
            `streamapp-library-scan-rate:${user?.username ?? 'default'}`,
            String(updatedRate),
          )
        } catch {
          historySaveFailed = true
        }
      }
      setFeedback(
        (result.cancelled
          ? `Actualización cancelada: ${result.indexed} nuevos y ${result.updated} elementos alcanzaron a escanearse.`
          : `Biblioteca actualizada: ${result.indexed} nuevos, ${result.updated} actualizados.`) +
        (historySaveFailed ? ' No se pudo guardar el historial de duración para futuras estimaciones.' : ''),
      )
      try {
        setFilterOptions(await libraryService.filterOptions())
        setFilterOptionsError('')
      } catch (err) {
        setFilterOptionsError(
          err instanceof ApiClientError ? err.message : 'No se pudieron actualizar las opciones de búsqueda',
        )
      }
      setPage(0)
      if (page === 0) await load()
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'No se pudo escanear la biblioteca')
    } finally {
      scanRequestActive.current = false
      setScanning(false)
      setScanCanceling(false)
      setScanStartedAt(null)
    }
  }

  const cancelScan = async () => {
    if (!scanning || scanCanceling) return
    scanCancellationRequested.current = true
    setScanCanceling(true)
    setError('')
    setFeedback('Solicitando la cancelación de la actualización...')
    try {
      if (scanRequestActive.current) {
        let requested = false
        while (scanRequestActive.current && !requested) {
          const result = await libraryService.cancelScan()
          requested = result.cancellationRequested
          if (!requested && scanRequestActive.current) {
            await new Promise((resolve) => window.setTimeout(resolve, 200))
          }
        }
        setFeedback(
          requested
            ? 'Cancelación solicitada. Se detendrá el escaneo en curso...'
            : 'La actualización terminó antes de que se pudiera cancelar.',
        )
      }
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'No se pudo solicitar la cancelación')
      setFeedback('')
      setScanCanceling(false)
    }
  }

  const openItem = (item: MediaItemDto) => {
    navigate(
      `/detalle?path=${encodeURIComponent(item.path)}&name=${encodeURIComponent(displayTitle(item))}` +
      `&type=${encodeURIComponent(item.mediaType)}&streamUrl=${encodeURIComponent(item.streamUrl)}` +
      `&mediaTypeDetail=${encodeURIComponent(item.mediaTypeDetail ?? '')}` +
      `&posterUrl=${encodeURIComponent(item.posterUrl ?? '')}`,
      { state: { returnTo: `${location.pathname}${location.search}`, returnScrollY: window.scrollY } },
    )
  }

  const hasSearchFilters = Boolean(
    query.trim() || actor.trim() || director.trim() || year || genre.trim() || stars || filter !== 'all',
  )

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <div className="eyebrow">STREAMAPP MEDIA SERVER</div>
          <h1>Mi biblioteca</h1>
          <div className="muted">{totalItems} elementos catalogados para reproducir</div>
        </div>
        <div className="library-scan-actions">
          <button type="button" className="btn btn-primary" onClick={() => void scan()} disabled={scanning}>
            {scanning ? 'Escaneando...' : 'Actualizar biblioteca'}
          </button>
          {scanning && (
            <button
              type="button"
              className="btn btn-ghost library-cancel-scan"
              onClick={() => void cancelScan()}
              disabled={scanCanceling}
            >
              {scanCanceling ? 'Cancelando...' : 'Cancelar actualización'}
            </button>
          )}
        </div>
      </header>

      {scanning && (
        <section className="library-scan-status" role="status" aria-live="polite">
          <div className="library-scan-status-copy">
            <strong>Actualizando biblioteca</strong>
            <span>Escaneando las fuentes y preparando los filtros. Esto puede tardar unos minutos.</span>
            <span className="library-scan-elapsed">Tiempo transcurrido: {scanElapsedSeconds} s</span>
            {scanCanceling && <span className="library-scan-cancel-message">Se está deteniendo el escaneo. Los cambios ya aplicados se conservarán.</span>}
            {scanEtaSeconds === null ? (
              <span>No hay datos suficientes para estimar esta actualización.</span>
            ) : scanElapsedSeconds >= scanEtaSeconds ? (
              <span className="library-scan-eta">Se superó la estimación inicial; el escaneo sigue activo.</span>
            ) : (
              <span className="library-scan-eta">
                Tiempo restante estimado: ~{formatDuration(scanEtaSeconds - scanElapsedSeconds)}
                {' · '}finalización aprox. {new Date(Date.now() + (scanEtaSeconds - scanElapsedSeconds) * 1000)
                  .toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                {' · '}calculado sobre {scanEstimateTitles} títulos
              </span>
            )}
          </div>
          <div
            className="library-scan-progress"
            role="progressbar"
            aria-label="Actualización de la biblioteca en curso"
            aria-valuetext={`Proceso en curso, ${scanElapsedSeconds} segundos transcurridos`}
          >
            <span />
          </div>
        </section>
      )}

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
          className="input library-title-search"
          value={query}
          onChange={(event) => { setPage(0); setQuery(event.target.value) }}
          placeholder="Buscar películas, series o archivos..."
          aria-label="Buscar en la biblioteca"
        />
        <select className="input library-filter" value={filter} onChange={(event) => { setPage(0); setFilter(event.target.value as typeof filter) }}>
          <option value="all">Todo</option>
          <option value="movie">Películas</option>
          <option value="series">Series</option>
          <option value="audio">Audio</option>
        </select>
        <select
          className="input"
          value={actor}
          onChange={(event) => { setPage(0); setActor(event.target.value) }}
          aria-label="Filtrar por actor"
        >
          <option value="">Todos los actores</option>
          {filterOptions.actors.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
        <select
          className="input"
          value={director}
          onChange={(event) => { setPage(0); setDirector(event.target.value) }}
          aria-label="Filtrar por director"
        >
          <option value="">Todos los directores</option>
          {filterOptions.directors.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
        <select
          className="input"
          value={year}
          onChange={(event) => { setPage(0); setYear(event.target.value) }}
          aria-label="Filtrar por año"
        >
          <option value="">Todos los años</option>
          {filterOptions.years.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
        <select
          className="input"
          value={genre}
          onChange={(event) => { setPage(0); setGenre(event.target.value) }}
          aria-label="Filtrar por género"
        >
          <option value="">Todos los géneros</option>
          {filterOptions.genres.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
        <select
          className="input"
          value={stars}
          onChange={(event) => { setPage(0); setStars(event.target.value) }}
          aria-label="Filtrar por estrellas mínimas"
        >
          <option value="">Cualquier puntuación</option>
          {filterOptions.stars.map((value) => (
            <option key={value} value={value}>{value} {value === 1 ? 'estrella o más' : 'estrellas o más'}</option>
          ))}
        </select>
      </div>

      {feedback && <div className="alert alert-info">{feedback}</div>}
      {error && <div className="alert alert-error">{error}</div>}
      {filterOptionsError && <div className="alert alert-error">{filterOptionsError}</div>}
      {loading ? (
        <div className="muted">Cargando biblioteca...</div>
      ) : items.length === 0 ? (
        <div className="empty">
          <p>{!hasSearchFilters ? 'Tu biblioteca todavía está vacía.' : 'No hay resultados para esa búsqueda.'}</p>
          {!hasSearchFilters && <p className="muted">Configura una raíz y pulsa «Actualizar biblioteca».</p>}
        </div>
      ) : (
        <div className="grid">
          {items.map((item) => (
            <MediaCard
              key={item.id}
              name={displayTitle(item)}
              displayName={displayTitle(item)}
              directory={false}
              playable
              mediaType={item.mediaType}
              mediaTypeDetail={item.mediaTypeDetail}
              posterUrl={item.posterUrl}
              year={item.year}
              genres={item.genres}
              voteAverage={item.voteAverage}
              onOpen={() => openItem(item)}
              onChangePoster={() => setPickerItem(item)}
            />
          ))}
        </div>
      )}
      {!loading && totalPages > 1 && (
        <div className="library-pagination">
          <button type="button" className="btn btn-ghost" disabled={page === 0} onClick={() => setPage((value) => value - 1)}>
            Anterior
          </button>
          <div className="library-page-numbers" aria-label="Páginas de la biblioteca">
            {Array.from(
              { length: Math.min(totalPages, 5) },
              (_, index) => Math.max(0, Math.min(page - 2, totalPages - 5)) + index,
            ).map((pageNumber) => (
              <button
                key={pageNumber}
                type="button"
                className={`btn ${pageNumber === page ? 'btn-primary' : 'btn-ghost'}`}
                aria-label={`Ir a la página ${pageNumber + 1}`}
                aria-current={pageNumber === page ? 'page' : undefined}
                onClick={() => setPage(pageNumber)}
              >
                {pageNumber + 1}
              </button>
            ))}
          </div>
          <span className="muted">Página {page + 1} de {totalPages}</span>
          <button type="button" className="btn btn-ghost" disabled={page + 1 >= totalPages} onClick={() => setPage((value) => value + 1)}>
            Siguiente
          </button>
        </div>
      )}
      {pickerItem && (
        <PosterPickerModal
          isOpen
          query={pickerItem.title}
          onClose={() => setPickerItem(null)}
          onSelect={async (selected) => {
            try {
              await titleDetailsService.savePoster(pickerItem.path, selected)
              setItems((current) => current.map((item) =>
                item.id === pickerItem.id || (selected.tmdbId != null && item.tmdbId === selected.tmdbId)
                  ? { ...item, posterUrl: selected.posterUrl, tmdbId: selected.tmdbId, year: selected.year, genres: selected.genres, cast: selected.cast, directors: selected.directors, voteAverage: selected.voteAverage, mediaTypeDetail: selected.mediaType }
                  : item,
              ))
              setFeedback(`Poster actualizado para "${pickerItem.title}"`)
            } catch {
              setError('No se pudo guardar el póster')
            } finally {
              setPickerItem(null)
            }
          }}
        />
      )}
    </div>
  )
}
