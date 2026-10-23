import { resolveServerUrl } from '../lib/api'
import type { MediaType } from '../types'

interface Props {
  name: string
  displayName: string
  directory: boolean
  playable: boolean
  mediaType: MediaType
  mediaTypeDetail?: string | null
  posterUrl?: string | null
  year?: number | null
  genres?: string | null
  voteAverage?: number | null
  badgeText?: string
  sourcePath?: string
  sourceColor?: string
  onOpenSource?: () => void
  onOpen: () => void
  onChangePoster?: () => void
}

export function MediaCard({
  name,
  displayName,
  directory,
  playable,
  mediaType,
  mediaTypeDetail,
  posterUrl,
  year,
  genres,
  voteAverage,
  badgeText,
  sourcePath,
  sourceColor,
  onOpenSource,
  onOpen,
  onChangePoster,
}: Props) {
  const rating = voteAverage == null ? null : Math.round(voteAverage / 2)
  const typeLabel = mediaTypeDetail === 'movie'
    ? 'Película'
    : mediaTypeDetail === 'series'
      ? 'Serie'
      : mediaType === 'AUDIO'
        ? 'Audio'
        : mediaType === 'VIDEO'
          ? 'Película'
          : 'Otro'
  const badge = year && voteAverage != null
    ? `${year} · ${'★'.repeat(rating ?? 0)}${'☆'.repeat(5 - (rating ?? 0))} ${voteAverage.toFixed(1)}`
    : voteAverage != null
      ? `${'★'.repeat(rating ?? 0)}${'☆'.repeat(5 - (rating ?? 0))} ${voteAverage.toFixed(1)}`
      : year
        ? String(year)
        : mediaType === 'AUDIO'
          ? 'Audio'
          : 'Video'

  return (
    <div className="card-wrap">
      <button type="button" className={`card ${playable ? 'card-playable' : ''}`} onClick={onOpen}>
        {playable && <span className="detail-badge type-badge">{typeLabel}</span>}
        {posterUrl ? (
          <>
            <img src={resolveServerUrl(posterUrl)} alt={displayName} className="card-poster" loading="lazy" />
            <div className="card-overlay">
              <div className="card-overlay-meta">
                {genres && <div className="card-overlay-genres">{genres.split(',').slice(0, 2).join(' · ')}</div>}
                <div className="card-overlay-year">
                  {year && <span>{year}</span>}
                  {voteAverage != null && (
                    <span className="card-stars">
                      {' '}{'★'.repeat(rating ?? 0)}{'☆'.repeat(5 - (rating ?? 0))} {voteAverage.toFixed(1)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="card-icon">{directory ? '📁' : mediaType === 'AUDIO' ? '🎵' : mediaType === 'VIDEO' ? '🎬' : '📄'}</div>
        )}
        <div className="card-title" title={name}>{displayName}</div>
        {(playable || badgeText) && <div className="card-badge">{badgeText ?? badge}</div>}
      </button>
      {playable && sourcePath && onOpenSource && (
        <div className="detail-source card-detail-source" style={sourceColor ? { borderColor: sourceColor } : undefined}>
          <div className="detail-source-path">
            <span style={sourceColor ? { color: sourceColor } : undefined}>Fuente</span>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onOpenSource}
            title="Abrir la carpeta de origen en el explorador"
          >
            Abrir carpeta
          </button>
        </div>
      )}
      {playable && onChangePoster && (
        <button type="button" className="btn btn-ghost btn-sm card-poster-action" onClick={onChangePoster}>
          🖼 Cambiar poster
        </button>
        
      )}
    </div>
  )
}