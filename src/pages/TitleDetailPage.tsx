import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { titleDetailsService, type TitleDetail, type EpisodeDto } from '../services/title-details'
import { favoritesService } from '../services/favorites'
import { ApiClientError, resolveServerUrl } from '../lib/api'
import { downloadM3uPlaylist, launchVlc } from '../lib/external-playback'
import { PosterPickerModal } from '../components/PosterPickerModal'

function formatRuntime(min: number | null): string {
  if (!min) return ''
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h > 0 && m > 0) return `${h} hr. ${m} min.`
  if (h > 0) return `${h} hr.`
  return `${m} min.`
}

export function TitleDetailPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const rawPath = params.get('path') || ''
  const rawName = params.get('name') || ''
  const type = params.get('type') || ''
  const streamUrl = params.get('streamUrl') || ''
  const posterParam = params.get('posterUrl') || ''

  const [detail, setDetail] = useState<TitleDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showTrailer, setShowTrailer] = useState(false)
  const [activeTab, setActiveTab] = useState<'reparto' | 'trailer' | 'detalles'>('reparto')
  const [expandedSeason, setExpandedSeason] = useState<number | null>(null)
  const [episodes, setEpisodes] = useState<EpisodeDto[]>([])
  const [epLoading, setEpLoading] = useState(false)
  const [showFullOverview, setShowFullOverview] = useState(false)
  const [favMsg, setFavMsg] = useState('')
  const [vlcMsg, setVlcMsg] = useState('')
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<TitleDetail | null>(null)
  const [savingMetadata, setSavingMetadata] = useState(false)
  const [metadataMsg, setMetadataMsg] = useState('')
  const [showMatchPicker, setShowMatchPicker] = useState(false)

  useEffect(() => {
    if (!rawName) {
      setError('Título no especificado')
      setLoading(false)
      return
    }
    setLoading(true)
    titleDetailsService
      .search(rawName, rawPath)
      .then((res) => {
        if (res) {
          setDetail(res)
        } else setError('No se encontró información en TMDB para este título')
      })
      .catch((err) => setError(err instanceof ApiClientError ? err.message : 'Error al consultar TMDB'))
      .finally(() => setLoading(false))
  }, [rawName])

  const poster = posterParam && posterParam !== 'null' && posterParam !== '' ? decodeURIComponent(posterParam) : detail?.posterUrl
  const backdrop = detail?.backdropUrl || poster
  const detailImage = detail?.backdropUrl || poster
  const backdropSrc = backdrop ? resolveServerUrl(backdrop) : undefined
  const detailImageSrc = detailImage ? resolveServerUrl(detailImage) : undefined
  const title = detail?.title || rawName.replace(/\.[a-z0-9]+$/i, '')
  const year = detail?.year
  const genres = detail?.genres
  const vote = detail?.voteAverage
  const typeLabelDetail = type === 'AUDIO' ? 'Audio' : detail?.mediaType === 'movie' ? 'Película' : detail?.mediaType === 'series' ? 'Serie' : type === 'VIDEO' ? 'Película' : 'Otro'
  const trailerUrl = detail?.trailerUrl
  const hasTrailer = trailerUrl && trailerUrl !== 'No disponible'
  const embedUrl = hasTrailer ? trailerUrl.replace('watch?v=', 'embed/') + '?autoplay=1&hl=es-419' : null
  const runtimeStr = formatRuntime(detail?.runtime ?? null)
  const countries = detail?.countries
  const studios = detail?.studios
  const releaseDate = detail?.releaseDate

  const goPlay = () => {
    if (!streamUrl) return
    navigate(`/player?src=${encodeURIComponent(streamUrl)}&title=${encodeURIComponent(title)}&type=${type}&path=${encodeURIComponent(rawPath)}`)
  }

  const playInVlc = () => {
    if (!streamUrl) return
    setVlcMsg('Si el navegador lo solicita, confirma la apertura de SVHome Player.')
    launchVlc(streamUrl, title)
  }

  const downloadForVlc = () => {
    if (!streamUrl) return
    downloadM3uPlaylist(streamUrl, title)
    setVlcMsg('Lista descargada. Ábrela desde Descargas con VLC. El enlace firmado vence en 30 minutos.')
  }

  const handleBack = () => {
    const navigationState = location.state as { returnTo?: string; returnScrollY?: number } | null
    const returnTo = navigationState?.returnTo
    if (returnTo) {
      navigate(returnTo, {
        state: navigationState.returnScrollY == null
          ? null
          : { restoreScrollY: navigationState.returnScrollY },
      })
      return
    }
    if (window.history.length > 1) navigate(-1)
    else {
      const sep = rawPath.includes('/') ? '/' : rawPath.includes('\\') ? '\\' : null
      if (sep && rawPath.includes(sep)) {
        const parent = rawPath.slice(0, rawPath.lastIndexOf(sep))
        navigate(`/?path=${encodeURIComponent(parent)}`)
      } else navigate('/')
    }
  }

  const addFavorite = async () => {
    if (!rawPath) return
    setFavMsg('')
    try {
      await favoritesService.add(rawPath)
      setFavMsg('Agregado a favoritos ♥')
    } catch (err) {
      setFavMsg(err instanceof ApiClientError ? err.message : 'Error al agregar a favoritos')
    }

  }

  const openEditor = () => {
    if (!detail) return
    setDraft({ ...detail })
    setMetadataMsg('')
    setEditing(true)
  }

  const saveMetadata = async () => {
    if (!draft || !rawPath) return
    setSavingMetadata(true)
    setMetadataMsg('')
    try {
      await titleDetailsService.updateMetadata(rawPath, draft)
      setDetail(draft)
      setEditing(false)
      setMetadataMsg('Metadata guardada')
    } catch (err) {
      setMetadataMsg(err instanceof ApiClientError ? err.message : 'No se pudo guardar la metadata')
    } finally {
      setSavingMetadata(false)
    }
  }

  const toggleSeason = async (seasonNumber: number) => {
    if (expandedSeason === seasonNumber) {
      setExpandedSeason(null)
      return
    }
    setExpandedSeason(seasonNumber)
    if (!detail) return
    setEpLoading(true)
    try {
      const eps = await titleDetailsService.season(detail.tmdbId, seasonNumber)
      setEpisodes(eps)
    } catch {
      setEpisodes([])
    } finally {
      setEpLoading(false)
    }
  }

  if (loading) return <div className="page"><div className="muted">Cargando detalle...</div></div>
  if (error) return <div className="page"><div className="alert alert-error">{error}</div><button className="btn btn-ghost" onClick={handleBack}>← Volver</button></div>
  if (!detail) return null

  const castList = detail.cast ? detail.cast.split(',').map((s) => s.trim()).filter(Boolean) : []

  return (
    <div className="page" style={{ maxWidth: '100%', padding: 0 }}>
      {/* Backdrop */}
      {backdropSrc && <div className="gnulahd-backdrop" style={{ backgroundImage: `url(${backdropSrc})` }} />}
      <div className="gnulahd-content">
        {/* <button type="button" className="btn btn-ghost" onClick={handleBack} style={{ margin: '12px 0' }}>
          ← Volver al explorador
        </button> */}

        {/* Hero: poster full width with horizontal gradient overlay */}
        <div className="gnrd-fi-hero">
        {/* <div className="detail-hero"> */}

        {/* Botón VOLVER AL EXPLORADOR */}
        <button type="button" className="btn btn-ghost btn-volver" onClick={handleBack} style={{ margin: '12px 0' }}>
          ← Volver al explorador
        </button>

        {/* Breadcrumb + original title */}
        <div className="muted" style={{ fontSize: 13 }}>
          {detail.mediaType === 'movie' ? 'Película' : 'Serie'} · {year ?? ''} {detail.titleOriginal && detail.titleOriginal !== title && `· ${detail.titleOriginal}`}
        </div>
        {detail.titleOriginal && detail.titleOriginal !== title && (
          <div className="muted" style={{ fontSize: 14, marginBottom: 4 }}>{detail.titleOriginal}</div>
        )}


          {detailImageSrc ? <img src={detailImageSrc} alt={title} className="detail-poster" /> : <div className="detail-poster detail-poster-placeholder">🎬</div>}
          <div className="detail-hero-gradient gnrd-fi-info">
            <div className="detail-hero-content">
              <h1 className="detail-title" style={{ fontSize: 60, lineHeight: 1.8, maxWidth: 920, color: '#fff' }}>{title}</h1>
            </div>
            {detail?.titleOriginal && detail.titleOriginal !== title && (
              <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 24 }}>{detail.titleOriginal}</div>
            )}
            <div className="detail-meta">
              <span className="detail-badge">{typeLabelDetail}</span>
              {vote != null && <span className="gnulahd-rating">★ {vote.toFixed(1)}</span>}
              {year && <span>{year}</span>}
              {runtimeStr && <span>{runtimeStr}</span>}
              {countries && <span>{countries.split(',')[0]}</span>}
            </div>
            {genres && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {genres.split(',').map((g) => (
                  <span key={g} className="detail-badge">{g.trim()}</span>
                ))}
              </div>
            )}
          </div>
        {/*</div>*/}
        </div>

        {/* Overview, actions, and details */}

        <div className="detail-info" style={{ marginTop: 0 }}>
          {detail.overview && (
            <p className="detail-overview gnrd-fi-syn clamp" style={{ maxWidth: 920 }}>
              {showFullOverview || detail.overview.length < 220 ? detail.overview : detail.overview.slice(0, 220) + '...'}
              {detail.overview.length >= 220 && (
                <button type="button" className="btn btn-ghost" style={{ padding: '2px 6px', marginLeft: 6, fontSize: 12 }} onClick={() => setShowFullOverview((v) => !v)}>
                  {showFullOverview ? 'Ver menos ↑' : 'Ver más ↓'}
                </button>
              )}
            </p>
          )}

          <div className="detail-actions">
            {streamUrl && (
              <button type="button" className="btn btn-primary" onClick={goPlay} style={{ padding: '10px 22px', fontSize: 16 }}>
                ▶ Ver ahora
              </button>
            )}
            {streamUrl && (
              <button type="button" className="btn" onClick={playInVlc}>
                ▶ Reproducir en VLC
              </button>
            )}
            {streamUrl && (
              <button type="button" className="btn btn-ghost" onClick={downloadForVlc}>
                Descargar M3U
              </button>
            )}
            <button type="button" className="btn" onClick={() => void addFavorite()}>
              ♥ Favorito
            </button>
            <button type="button" className="btn" disabled>
              ＋ Mi lista
            </button>
            {hasTrailer && (
              <button type="button" className="btn" onClick={() => setShowTrailer(true)}>▶ Trailer</button>
            )}
            <button type="button" className="btn" onClick={openEditor}>✎ Editar metadata</button>
            {favMsg && <span className="player-fav-msg">{favMsg}</span>}
            {vlcMsg && <span className="player-fav-msg">{vlcMsg}</span>}
            {metadataMsg && <span className="player-fav-msg">{metadataMsg}</span>}
          </div>
          <p className="muted">
            Windows requiere instalar el{' '}
            <a href="/windows/install-vlc-player-bridge.ps1" download="install-vlc-player-bridge.ps1">
              puente de VLC
            </a>{' '}
            una vez por usuario.
          </p>

          <div className="gnulahd-grid">
            <div><span className="muted">Año</span><br /><strong>{year ?? '—'}</strong></div>
            <div><span className="muted">Duración</span><br /><strong>{runtimeStr || '—'}</strong></div>
            <div><span className="muted">Calidad</span><br /><strong>HD</strong></div>
            <div><span className="muted">Audio</span><br /><strong>Latino · Subtitulado</strong></div>
            <div><span className="muted">País</span><br /><strong>{countries || '—'}</strong></div>
            {studios && <div><span className="muted">Estudio</span><br /><strong>{studios.split(',')[0]}</strong></div>}
          </div>
        </div>

        {/* Tabs */}
        <div className="gnulahd-tabs">
          <button type="button" className={`gnulahd-tab ${activeTab === 'reparto' ? 'active' : ''}`} onClick={() => setActiveTab('reparto')}>Reparto</button>
          <button type="button" className={`gnulahd-tab ${activeTab === 'trailer' ? 'active' : ''}`} onClick={() => setActiveTab('trailer')}>Tráiler</button>
          <button type="button" className={`gnulahd-tab ${activeTab === 'detalles' ? 'active' : ''}`} onClick={() => setActiveTab('detalles')}>Detalles</button>
        </div>

        {activeTab === 'reparto' && (
          <div className="gnulahd-cast">
            {castList.length === 0 ? (
              <div className="muted">Sin datos de reparto</div>
            ) : (
              castList.map((name) => (
                <div key={name} className="gnulahd-cast-card">
                  <div className="gnulahd-cast-avatar">{name.split(' ').map((w) => w[0]).slice(0, 2).join('')}</div>
                  <div className="gnulahd-cast-name">{name}</div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'trailer' && (
          <div style={{ marginTop: 12 }}>
            {hasTrailer && embedUrl ? (
              <div style={{ aspectRatio: '16/9', background: '#000', borderRadius: 12, overflow: 'hidden', maxWidth: 800 }}>
                <iframe src={embedUrl} title={`Trailer ${title}`} allow="autoplay; encrypted-media" allowFullScreen style={{ width: '100%', height: '100%', border: 0 }} />
              </div>
            ) : (
              <div className="muted">Trailer no disponible en español latino; se mostrará subtitulado si existe.</div>
            )}
          </div>
        )}

        {activeTab === 'detalles' && (
          <div className="gnulahd-details">
            <p><strong>Título original:</strong> {detail.titleOriginal || '—'}</p>
            <p><strong>Estreno:</strong> {releaseDate ? new Date(releaseDate).toLocaleDateString('es-AR') : year ?? '—'}</p>
            <p><strong>Duración:</strong> {runtimeStr || '—'}</p>
            <p><strong>País:</strong> {countries || '—'}</p>
            {studios && <p><strong>Estudio:</strong> {studios}</p>}
            {detail.directors && <p><strong>Director:</strong> {detail.directors}</p>}
            <p><strong>Géneros:</strong> {genres || '—'}</p>
            <p><strong>Puntuación:</strong> {vote != null ? `★ ${vote.toFixed(1)} / 10` : '—'}</p>
            <p><strong>Reparto:</strong> {detail.cast || '—'}</p>
            {detail.overview && <p><strong>Sinopsis:</strong> {detail.overview}</p>}
          </div>
        )}

        {/* Temporadas para series */}
        {detail.mediaType === 'series' && detail.seasons && detail.seasons.length > 0 && (
          <div className="detail-seasons">
            <h3>Temporadas ({detail.seasons.filter((s) => s.seasonNumber > 0).length})</h3>
            {detail.seasons
              .filter((s) => s.seasonNumber > 0)
              .map((season) => (
                <div key={season.seasonNumber} className="season-row">
                  <button type="button" className="season-header" onClick={() => void toggleSeason(season.seasonNumber)}>
                    <span>
                      {season.name} · {season.episodeCount} capítulos {season.airDate ? `· ${season.airDate.substring(0, 4)}` : ''}
                    </span>
                    <span>{expandedSeason === season.seasonNumber ? '▾' : '▸'}</span>
                  </button>
                  {expandedSeason === season.seasonNumber && (
                    <div className="season-episodes">
                      {epLoading ? (
                        <div className="muted">Cargando capítulos...</div>
                      ) : episodes.length === 0 ? (
                        <div className="muted">Sin info de capítulos</div>
                      ) : (
                        episodes.map((ep) => (
                          <div key={ep.episodeNumber} className="episode-row">
                            {ep.stillUrl && <img src={ep.stillUrl} alt={ep.name} className="episode-still" loading="lazy" />}
                            <div className="episode-info">
                              <strong>
                                {ep.episodeNumber}. {ep.name}
                              </strong>
                              {ep.airDate && <span className="muted"> · {ep.airDate}</span>}
                              {ep.overview && <p className="muted" style={{ fontSize: 13, margin: '4px 0 0' }}>{ep.overview}</p>}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              ))}
          </div>
        )}
      </div>

      {showTrailer && embedUrl && (
        <div className="modal-overlay" onClick={() => setShowTrailer(false)}>
          <div className="modal" style={{ width: 'min(800px, 95vw)', maxHeight: '90vh' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Trailer — {title}</h2>
              <button type="button" className="btn btn-ghost" onClick={() => setShowTrailer(false)}>✕</button>
            </div>
            <div style={{ aspectRatio: '16/9', background: '#000' }}>
              <iframe src={embedUrl} title={`Trailer ${title}`} allow="autoplay; encrypted-media" allowFullScreen style={{ width: '100%', height: '100%', border: 0 }} />
            </div>
          </div>
        </div>
      )}

      {editing && draft && (
        <div className="modal-overlay" onClick={() => setEditing(false)}>
          <div className="modal metadata-editor" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h2>Editar metadata</h2>
              <button type="button" className="btn btn-ghost" onClick={() => setEditing(false)}>✕</button>
            </div>
            <label className="field-label">Título<input className="input" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
            <label className="field-label">Título original<input className="input" value={draft.titleOriginal} onChange={(event) => setDraft({ ...draft, titleOriginal: event.target.value })} /></label>
            <label className="field-label">Año<input className="input" type="number" value={draft.year ?? ''} onChange={(event) => setDraft({ ...draft, year: event.target.value ? Number(event.target.value) : null })} /></label>
            <label className="field-label">Géneros<input className="input" value={draft.genres} onChange={(event) => setDraft({ ...draft, genres: event.target.value })} placeholder="Acción, Drama" /></label>
            <label className="field-label">Poster URL<input className="input" value={draft.posterUrl ?? ''} onChange={(event) => setDraft({ ...draft, posterUrl: event.target.value || null })} /></label>
            <label className="field-label">Backdrop URL<input className="input" value={draft.backdropUrl ?? ''} onChange={(event) => setDraft({ ...draft, backdropUrl: event.target.value || null })} /></label>
            <label className="field-label">Sinopsis<textarea className="input" rows={5} value={draft.overview} onChange={(event) => setDraft({ ...draft, overview: event.target.value })} /></label>
            <div className="detail-actions">
              <button type="button" className="btn" onClick={() => setShowMatchPicker(true)}>Buscar coincidencia en TMDB</button>
              <button type="button" className="btn btn-primary" disabled={savingMetadata} onClick={() => void saveMetadata()}>
                {savingMetadata ? 'Guardando...' : 'Guardar cambios'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setEditing(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {draft && (
        <PosterPickerModal
          isOpen={showMatchPicker}
          query={draft.title}
          onClose={() => setShowMatchPicker(false)}
          onSelect={(selected) => {
            setDraft(selected)
            setShowMatchPicker(false)
            setMetadataMsg('Coincidencia seleccionada. Revisá los datos y guardá los cambios.')
          }}
        />
      )}
    </div>
  )
}
