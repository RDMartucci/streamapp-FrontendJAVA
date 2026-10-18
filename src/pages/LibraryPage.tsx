import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { ApiClientError } from '../lib/api'
import { useAuth } from '../lib/auth'
import { libraryService } from '../services/library'
import { titleDetailsService } from '../services/title-details'
import { PosterPickerModal } from '../components/PosterPickerModal'
import { MediaCard } from '../components/MediaCard'
import { MediaCarousel } from '../components/MediaCarousel'
import type { MediaItemDto } from '../types'

const LIBRARY_PAGE_SIZE = 24

interface SeriesGroup {
  title: string
  episodes: MediaItemDto[]
}

type LibraryGridEntry =
  | { kind: 'series'; group: SeriesGroup }
  | { kind: 'item'; item: MediaItemDto }

function displayTitle(item: MediaItemDto): string {
  return item.title || item.path.split(/[\\/]/).pop() || item.path
}

function episodeFilename(item: MediaItemDto): string {
  return item.path.split(/[\\/]/).pop()?.replace(/\.[^.]+$/, '') || displayTitle(item)
}

function matchesExactList(value: string | null | undefined, selected: string): boolean {
  return (value ?? '').split(',').some((entry) => entry.trim().toLocaleLowerCase() === selected.toLocaleLowerCase())
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds} s`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return remainingSeconds === 0 ? `${minutes} min` : `${minutes} min ${remainingSeconds} s`
}

function LibraryPagination({
  page,
  totalItems,
  onPageChange,
}: {
  page: number
  totalItems: number
  onPageChange: (nextPage: number) => void
}) {
  const totalPages = Math.ceil(totalItems / LIBRARY_PAGE_SIZE)
  if (totalPages <= 1) return null

  const firstPage = Math.max(0, Math.min(page - 2, totalPages - 5))
  const pageNumbers = Array.from(
    { length: Math.min(totalPages, 5) },
    (_, index) => firstPage + index,
  )

  return (
    <nav className="library-pagination" aria-label="Paginación de resultados">
      <button
        type="button"
        className="btn btn-ghost"
        disabled={page === 0}
        onClick={() => onPageChange(page - 1)}
      >
        Anterior
      </button>
      <div className="library-page-numbers">
        {pageNumbers.map((pageNumber) => (
          <button
            key={pageNumber}
            type="button"
            className={`btn ${pageNumber === page ? 'btn-primary' : 'btn-ghost'}`}
            aria-label={`Ir a la página ${pageNumber + 1}`}
            aria-current={pageNumber === page ? 'page' : undefined}
            onClick={() => onPageChange(pageNumber)}
          >
            {pageNumber + 1}
          </button>
        ))}
      </div>
      <span className="muted">
        {page * LIBRARY_PAGE_SIZE + 1}–{Math.min((page + 1) * LIBRARY_PAGE_SIZE, totalItems)} de {totalItems}
      </span>
      <button
        type="button"
        className="btn btn-ghost"
        disabled={page + 1 >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        Siguiente
      </button>
    </nav>
  )
}

export function LibraryPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user } = useAuth()
  const [items, setItems] = useState<MediaItemDto[]>([])
  const [randomSuggestion, setRandomSuggestion] = useState<{
    entry: LibraryGridEntry
    filterKey: string
  } | null>(null)
  const [page, setPage] = useState(() => {
    const value = Number(searchParams.get('page'))
    return Number.isInteger(value) && value > 0 ? value : 0
  })
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
  const [selectedSeries, setSelectedSeries] = useState(() => searchParams.get('series') ?? '')
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
    if (selectedSeries) params.set('series', selectedSeries)
    if (actor) params.set('actor', actor)
    if (director) params.set('director', director)
    if (year) params.set('year', year)
    if (genre) params.set('genre', genre)
    if (stars) params.set('stars', stars)
    if (params.toString() !== searchParams.toString()) {
      setSearchParams(params, { replace: true, state: location.state })
    }
  }, [page, query, filter, selectedSeries, actor, director, year, genre, stars, searchParams, setSearchParams, location.state])

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
      const result = await libraryService.items()
      setItems(result)
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'No se pudo cargar la biblioteca')
    } finally {
      setLoading(false)
    }
  }, [])

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

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase()
    const minimumVote = stars ? (Number(stars) - 0.5) * 2 : null
    return items.filter((item) => {
      if (normalizedQuery && !`${displayTitle(item)} ${item.path}`.toLocaleLowerCase().includes(normalizedQuery)) return false
      if (filter === 'audio' && item.mediaType !== 'AUDIO') return false
      if (filter === 'movie' && item.mediaTypeDetail !== 'movie') return false
      if (filter === 'series' && item.mediaTypeDetail !== 'series') return false
      if (actor && !matchesExactList(item.cast, actor)) return false
      if (director && !matchesExactList(item.directors, director)) return false
      if (year && item.year !== Number(year)) return false
      if (genre && !matchesExactList(item.genres, genre)) return false
      if (minimumVote !== null && (item.voteAverage == null || item.voteAverage < minimumVote)) return false
      return true
    })
  }, [items, query, filter, actor, director, year, genre, stars])

  const hasSearchFilters = Boolean(
    query.trim() || actor.trim() || director.trim() || year || genre.trim() || stars || filter !== 'all',
  )

  const seriesGroups = useMemo(() => {
    const groups = new Map<string, { title: string; episodes: MediaItemDto[] }>()
    filteredItems
      .filter((item) => item.mediaTypeDetail === 'series')
      .forEach((item) => {
        const title = displayTitle(item)
        const key = title.trim().toLocaleLowerCase()
        const group = groups.get(key) ?? { title, episodes: [] }
        group.episodes.push(item)
        groups.set(key, group)
      })
    return [...groups.values()].sort((left, right) => left.title.localeCompare(right.title))
  }, [filteredItems])

  const selectedSeriesGroup = seriesGroups.find(
    (group) => group.title.toLocaleLowerCase() === selectedSeries.toLocaleLowerCase(),
  )
  const movieItems = useMemo(
    () => filteredItems
      .filter((item) => item.mediaTypeDetail === 'movie')
      .sort((left, right) => displayTitle(left).localeCompare(displayTitle(right))),
    [filteredItems],
  )
  const audioItems = useMemo(
    () => filteredItems
      .filter((item) => item.mediaType === 'AUDIO')
      .sort((left, right) => displayTitle(left).localeCompare(displayTitle(right))),
    [filteredItems],
  )
  const selectedEpisodes = selectedSeriesGroup?.episodes ?? []
  const heroMovieCount = movieItems.length
  const heroSeriesCount = selectedSeries ? selectedEpisodes.length : seriesGroups.length
  const heroAudioCount = audioItems.length
  const heroCatalogCount = heroMovieCount + heroSeriesCount + heroAudioCount
  const gridEntries = useMemo<LibraryGridEntry[]>(() => {
    if (selectedSeries) {
      return selectedEpisodes.map((item) => ({ kind: 'item', item }))
    }
    const entries: LibraryGridEntry[] = []
    if (filter === 'all' || filter === 'series') {
      entries.push(...seriesGroups.map((group) => ({ kind: 'series' as const, group })))
    }
    entries.push(
      ...filteredItems
        .filter((item) => item.mediaTypeDetail !== 'series')
        .map((item) => ({ kind: 'item' as const, item })),
    )
    return entries.sort((left, right) => {
      const leftTitle = left.kind === 'series' ? left.group.title : displayTitle(left.item)
      const rightTitle = right.kind === 'series' ? right.group.title : displayTitle(right.item)
      return leftTitle.localeCompare(rightTitle)
    })
  }, [selectedSeries, selectedEpisodes, filter, seriesGroups, filteredItems])
  const totalPages = Math.ceil(gridEntries.length / LIBRARY_PAGE_SIZE)
  const currentGridEntries = gridEntries.slice(
    page * LIBRARY_PAGE_SIZE,
    (page + 1) * LIBRARY_PAGE_SIZE,
  )
  const suggestionFilterKey = JSON.stringify([
    query.trim(), filter, actor, director, year, genre, stars, selectedSeries,
  ])
  const currentSuggestion = randomSuggestion?.filterKey === suggestionFilterKey
    ? randomSuggestion.entry
    : null
  useEffect(() => {
    if (page >= totalPages && page > 0) setPage(Math.max(0, totalPages - 1))
  }, [page, totalPages])

  const hasVisibleResults = selectedSeries
    ? selectedEpisodes.length > 0
    : hasSearchFilters
      ? filteredItems.length > 0
      : movieItems.length > 0 || seriesGroups.length > 0 || audioItems.length > 0

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
      await load()
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

  const suggestRandomTitle = () => {
    if (gridEntries.length === 0) return
    const entry = gridEntries[Math.floor(Math.random() * gridEntries.length)]
    setRandomSuggestion({ entry, filterKey: suggestionFilterKey })
  }

  const openSuggestedTitle = (entry: LibraryGridEntry) => {
    if (entry.kind === 'series') {
      setPage(0)
      setSelectedSeries(entry.group.title)
      return
    }
    openItem(entry.item)
  }

  const suggestedTitle = currentSuggestion
    ? currentSuggestion.kind === 'series'
      ? currentSuggestion.group.title
      : currentSuggestion.item.mediaTypeDetail === 'series'
        ? episodeFilename(currentSuggestion.item)
        : displayTitle(currentSuggestion.item)
    : ''
  const suggestedDescription = currentSuggestion
    ? currentSuggestion.kind === 'series'
      ? `Serie · ${currentSuggestion.group.episodes.length} episodios`
      : currentSuggestion.item.mediaType === 'AUDIO'
        ? 'Audio'
        : currentSuggestion.item.mediaTypeDetail === 'series'
          ? 'Episodio'
          : 'Película'
    : ''

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <div className="eyebrow">SVHOME MEDIA SERVER</div>
          <h1>Mi biblioteca</h1>
        </div>
        <div className="library-scan-actions">
          <button
            type="button"
            className="btn btn-ghost library-random-button"
            onClick={suggestRandomTitle}
            disabled={loading || scanning || gridEntries.length === 0}
            title="Sugerir un título al azar entre los resultados actuales"
          >
            🎲 Sorpréndeme
          </button>
          <span className="library-scan-divider" aria-hidden="true" />
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
          <div><strong>{heroCatalogCount}</strong><span>Catalogados</span></div>
          <div><strong>{heroMovieCount}</strong><span>Películas</span></div>
          <div><strong>{heroSeriesCount}</strong><span>{selectedSeries ? 'Episodios' : 'Series'}</span></div>
          <div><strong>{heroAudioCount}</strong><span>Audio</span></div>
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
        <select
          className="input library-filter"
          value={filter}
          onChange={(event) => {
            setPage(0)
            setFilter(event.target.value as typeof filter)
            setSelectedSeries('')
          }}
        >
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

      {currentSuggestion && (
        <section className="library-random-suggestion" aria-live="polite">
          <div>
            <span className="library-random-eyebrow">Sugerencia al azar</span>
            <h2>{suggestedTitle}</h2>
            <span className="muted">{suggestedDescription}</span>
          </div>
          <div className="library-random-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => openSuggestedTitle(currentSuggestion)}
            >
              {currentSuggestion.kind === 'series' ? 'Ver serie' : 'Abrir título'}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={suggestRandomTitle}
            >
              Otra sugerencia
            </button>
            <button
              type="button"
              className="btn btn-ghost library-suggestion-dismiss"
              onClick={() => setRandomSuggestion(null)}
              aria-label="Cerrar sugerencia"
              title="Cerrar sugerencia"
            >
              ✕
            </button>
          </div>
        </section>
      )}

      {feedback && <div className="alert alert-info">{feedback}</div>}
      {error && <div className="alert alert-error">{error}</div>}
      {filterOptionsError && <div className="alert alert-error">{filterOptionsError}</div>}
      {loading ? (
        <div className="muted">Cargando biblioteca...</div>
      ) : !hasVisibleResults ? (
        <div className="empty">
          {selectedSeries && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setSelectedSeries('')}
            >
              ← Todas las series
            </button>
          )}
          <p>{items.length === 0 && !hasSearchFilters ? 'Tu biblioteca todavía está vacía.' : 'No hay resultados para esa búsqueda.'}</p>
          {items.length === 0 && !hasSearchFilters && <p className="muted">Configura una raíz y pulsa «Actualizar biblioteca».</p>}
        </div>
      ) : (
        <>
          {selectedSeries && (
            <div className="library-selected-series">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setSelectedSeries('')}
              >
                ← Todas las series
              </button>
              <h2>{selectedSeriesGroup?.title ?? selectedSeries}</h2>
              <p className="muted">{selectedEpisodes.length} episodios</p>
              {hasSearchFilters ? (
                <>
                  <div className="grid">
                    {currentGridEntries.map((entry) => entry.kind === 'item' && (
                    <MediaCard
                      key={entry.item.id}
                      name={episodeFilename(entry.item)}
                      displayName={episodeFilename(entry.item)}
                      directory={false}
                      playable
                      mediaType={entry.item.mediaType}
                      mediaTypeDetail={entry.item.mediaTypeDetail}
                      posterUrl={entry.item.posterUrl}
                      year={entry.item.year}
                      genres={entry.item.genres}
                      voteAverage={entry.item.voteAverage}
                      onOpen={() => openItem(entry.item)}
                      onChangePoster={() => setPickerItem(entry.item)}
                    />
                    ))}
                  </div>
                  <LibraryPagination
                    page={page}
                    totalItems={gridEntries.length}
                    onPageChange={setPage}
                  />
                </>
              ) : (
                <MediaCarousel title="Episodios" count={selectedEpisodes.length}>
                  {selectedEpisodes.map((item) => (
                  <MediaCard
                    key={item.id}
                    name={episodeFilename(item)}
                    displayName={episodeFilename(item)}
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
                </MediaCarousel>
              )}
            </div>
          )}
          {!selectedSeries && (
            hasSearchFilters ? (
              <section className="library-filtered-results" aria-label="Resultados filtrados">
                <h2>
                  {filter === 'movie'
                    ? 'Películas'
                    : filter === 'series'
                      ? 'Series'
                      : filter === 'audio'
                        ? 'Audio'
                        : 'Resultados de búsqueda'}
                </h2>
                <div className="grid">
                  {currentGridEntries.map((entry) => {
                    if (entry.kind === 'series') {
                      const cover = entry.group.episodes.find((episode) => episode.posterUrl) ?? entry.group.episodes[0]
                      return (
                        <MediaCard
                          key={entry.group.title}
                          name={entry.group.title}
                          displayName={entry.group.title}
                          directory={false}
                          playable
                          mediaType={cover?.mediaType ?? 'VIDEO'}
                          mediaTypeDetail="series"
                          posterUrl={cover?.posterUrl}
                          year={cover?.year}
                          genres={cover?.genres}
                          voteAverage={cover?.voteAverage}
                          badgeText={`${entry.group.episodes.length} episodios`}
                          onOpen={() => { setPage(0); setSelectedSeries(entry.group.title) }}
                        />
                      )
                    }
                    const item = entry.item
                    return (
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
                    )
                  })}
                </div>
                <LibraryPagination
                  page={page}
                  totalItems={gridEntries.length}
                  onPageChange={setPage}
                />
              </section>
            ) : (
              <div className="library-media-rows">
                {movieItems.length > 0 && (
                  <MediaCarousel title="Películas" count={movieItems.length}>
                    {movieItems.map((item) => (
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
                  </MediaCarousel>
                )}
                {seriesGroups.length > 0 && (
                  <MediaCarousel title="Series" count={seriesGroups.length}>
                    {seriesGroups.map((group) => {
                      const cover = group.episodes.find((episode) => episode.posterUrl) ?? group.episodes[0]
                      return (
                        <MediaCard
                          key={group.title}
                          name={group.title}
                          displayName={group.title}
                          directory={false}
                          playable
                          mediaType={cover?.mediaType ?? 'VIDEO'}
                          mediaTypeDetail="series"
                          posterUrl={cover?.posterUrl}
                          year={cover?.year}
                          genres={cover?.genres}
                          voteAverage={cover?.voteAverage}
                          badgeText={`${group.episodes.length} episodios`}
                          onOpen={() => setSelectedSeries(group.title)}
                        />
                      )
                    })}
                  </MediaCarousel>
                )}
                {audioItems.length > 0 && (
                  <MediaCarousel title="Audio" count={audioItems.length}>
                    {audioItems.map((item) => (
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
                  </MediaCarousel>
                )}
              </div>
            )
          )}
        </>
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
