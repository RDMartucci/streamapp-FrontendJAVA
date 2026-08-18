import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api, ApiClientError } from '../lib/api'

export function PlayerPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const src = params.get('src') || ''
  const title = params.get('title') || 'Reproducción'
  const type = params.get('type') || ''
  const path = params.get('path') || ''

  const mediaRef = useRef<HTMLMediaElement>(null)
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)
  const [favMsg, setFavMsg] = useState('')

  useEffect(() => {
    if (!src) {
      navigate('/', { replace: true })
    }
  }, [src, navigate])

  const addFavorite = async () => {
    setFavMsg('')
    try {
      await api.post('/favorites', { path })
      setFavMsg('Agregado a favoritos')
    } catch (err) {
      setFavMsg(err instanceof ApiClientError ? err.message : 'Error al agregar a favoritos')
    }
  }

  const isVideo = type === 'VIDEO'

  if (!src) {
    return null
  }

  return (
    <div className="player-screen">
      <div className="player-topbar">
        <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>
          ← Volver
        </button>
        <span className="player-title">{title}</span>
        <div className="player-actions">
          {path && (
            <button type="button" className="btn btn-sm" onClick={() => void addFavorite()}>
              ♥ Favorito
            </button>
          )}
          {favMsg && <span className="player-fav-msg">{favMsg}</span>}
        </div>
      </div>

      <div className="player-stage">
        {isVideo ? (
          <video
            ref={mediaRef as React.RefObject<HTMLVideoElement>}
            className="player-video"
            src={src}
            controls
            autoPlay
            onCanPlay={() => setReady(true)}
            onError={() => setError('No se pudo reproducir este video')}
          >
            Tu navegador no soporta video.
          </video>
        ) : (
          <div className="player-audio-wrap">
            <div className="player-audio-art">🎵</div>
            <audio
              ref={mediaRef as React.RefObject<HTMLAudioElement>}
              className="player-audio"
              src={src}
              controls
              autoPlay
              onCanPlay={() => setReady(true)}
              onError={() => setError('No se pudo reproducir este audio')}
            >
              Tu navegador no soporta audio.
            </audio>
          </div>
        )}

        {!ready && !error && <div className="muted">Cargando stream...</div>}
        {error && <div className="alert alert-error">{error}</div>}
      </div>
    </div>
  )
}