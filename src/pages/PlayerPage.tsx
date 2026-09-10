import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { favoritesService } from '../services/favorites'
import { ApiClientError } from '../lib/api'

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
  const [externalPlayer, setExternalPlayer] = useState('VLC')
  const [externalMsg, setExternalMsg] = useState('')

  useEffect(() => {
    if (!src) {
      navigate('/', { replace: true })
    }
  }, [src, navigate])

  const addFavorite = async () => {
    setFavMsg('')
    try {
      await favoritesService.add(path)
      setFavMsg('Agregado a favoritos')
    } catch (err) {
      setFavMsg(err instanceof ApiClientError ? err.message : 'Error al agregar a favoritos')
    }
  }

  const copyExternalUrl = async () => {
    try {
      await navigator.clipboard.writeText(new URL(src, window.location.origin).toString())
      setExternalMsg(`URL copiada. Abrila con ${externalPlayer}.`)
    } catch {
      setExternalMsg('No se pudo copiar la URL del stream')
    }
  }

  const downloadPlaylist = () => {
    const streamUrl = new URL(src, window.location.origin).toString()
    const blob = new Blob([`#EXTM3U\n#EXTINF:-1,${title}\n${streamUrl}\n`], { type: 'audio/x-mpegurl' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${title.replace(/[\\/:*?"<>|]/g, '_')}.m3u`
    link.click()
    URL.revokeObjectURL(url)
    setExternalMsg(`Lista creada para abrir con ${externalPlayer}.`)
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

      <div className="panel player-external-panel">
        <h2>Reproductor externo</h2>
        <div className="form-row">
          <label htmlFor="external-player">Abrir con</label>
          <select
            id="external-player"
            className="input"
            value={externalPlayer}
            onChange={(event) => setExternalPlayer(event.target.value)}
          >
            <option>VLC</option>
            <option>MPV</option>
            <option>PotPlayer</option>
            <option>Otro reproductor</option>
          </select>
          <button type="button" className="btn" onClick={() => void copyExternalUrl()}>
            Copiar URL del stream
          </button>
          <button type="button" className="btn" onClick={downloadPlaylist}>
            Descargar lista M3U
          </button>
        </div>
        <p className="muted">Copiá la URL y pegala en el reproductor seleccionado, o abrí la lista M3U con su asociación de Windows.</p>
        {externalMsg && <div className="alert alert-info">{externalMsg}</div>}
      </div>
    </div>
  )
}