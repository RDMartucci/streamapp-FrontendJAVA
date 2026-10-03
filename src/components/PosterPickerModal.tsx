import { useEffect, useState } from 'react'
import { titleDetailsService, type TitleDetail } from '../services/title-details'

interface Props {
  isOpen: boolean
  onClose: () => void
  query: string
  onSelect: (detail: TitleDetail) => void
}

export function PosterPickerModal({ isOpen, onClose, query, onSelect }: Props) {
  const [candidates, setCandidates] = useState<TitleDetail[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isOpen || !query) return
    setLoading(true)
    setError('')
    titleDetailsService
      .searchList(query)
      .then((list) => setCandidates(list ?? []))
      .catch((err: unknown) => {
        setCandidates([])
        setError(err instanceof Error ? err.message : 'No se pudo consultar TMDB.')
      })
      .finally(() => setLoading(false))
  }, [isOpen, query])

  const handlePick = async (c: TitleDetail) => {
    // Traer detalle completo para tener géneros/cast/etc antes de guardar
    try {
      const full = c.mediaType === 'series' ? await titleDetailsService.series(c.tmdbId) : await titleDetailsService.detail(c.tmdbId)
      onSelect(full ?? c)
    } catch {
      onSelect(c)
    }
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ width: 'min(720px, 95vw)', maxHeight: '85vh' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Elegir coincidencia para "{query}"</h2>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="modal-body">
          {loading ? (
            <div className="muted">Buscando películas y series en TMDB...</div>
          ) : error ? (
            <div className="alert alert-error">{error}</div>
          ) : candidates.length === 0 ? (
            <div className="muted">Sin coincidencias. Probá con otro título o dejá el nombre más limpio.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {candidates.map((c) => (
                <button key={`${c.tmdbId}-${c.mediaType}`} type="button" onClick={() => void handlePick(c)} className="list-row" style={{ textAlign: 'left', cursor: 'pointer' }}>
                  {c.posterUrl ? <img src={c.posterUrl} alt={c.title} style={{ width: 54, height: 80, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} /> : <div style={{ width: 54, height: 80, display: 'grid', placeItems: 'center', background: 'var(--bg-elevated)', borderRadius: 6 }}>🎬</div>}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {c.title} {c.year ? `(${c.year})` : ''}
                    </div>
                    <div className="muted" style={{ fontSize: 12 }}>{c.titleOriginal !== c.title ? c.titleOriginal : ''}</div>
                    <div className="muted" style={{ fontSize: 12 }}>{c.mediaType === 'movie' ? 'Película' : 'Serie'} {c.voteAverage != null ? `· ★ ${c.voteAverage.toFixed(1)}` : ''}</div>
                  </div>
                  <span className="btn btn-primary btn-sm">Usar</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
