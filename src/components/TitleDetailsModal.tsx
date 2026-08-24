import type { TitleDetail } from '../services/title-details'

interface Props {
  isOpen: boolean
  onClose: () => void
  detail: TitleDetail
}

export function TitleDetailsModal({ isOpen, onClose, detail }: Props) {
  if (!isOpen) return null
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640 }}>
        <div className="modal-header">
          <h2>{detail.title} {detail.year ? `(${detail.year})` : ''}</h2>
          <button type="button" className="btn btn-ghost" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body" style={{ display: 'flex', gap: 16 }}>
          {detail.posterUrl && <img src={detail.posterUrl} alt={detail.title} style={{ width: 180, borderRadius: 8, flexShrink: 0 }} />}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
            {detail.titleOriginal && detail.titleOriginal !== detail.title && <p><strong>Título original:</strong> {detail.titleOriginal}</p>}
            {detail.genres && <p><strong>Géneros:</strong> {detail.genres}</p>}
            {detail.directors && <p><strong>Director(es):</strong> {detail.directors}</p>}
            {detail.cast && <p><strong>Reparto:</strong> {detail.cast}</p>}
            {detail.overview && <p style={{ color: 'var(--text-muted)' }}>{detail.overview}</p>}
            {detail.trailerUrl && detail.trailerUrl !== 'No disponible' && (
              <a href={detail.trailerUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>
                ▶ Ver trailer
              </a>
            )}
            <span className="muted" style={{ fontSize: 12 }}>{detail.mediaType === 'movie' ? 'Película' : 'Serie'} · TMDB #{detail.tmdbId}</span>
          </div>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  )
}
