import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, ApiClientError } from '../lib/api'
import type { FavoriteDto } from '../types'

export function FavoritesPage() {
  const [items, setItems] = useState<FavoriteDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setItems(await api.get<FavoriteDto[]>('/favorites'))
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Error al cargar favoritos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const play = (f: FavoriteDto) => {
    navigate(
      `/player?src=${encodeURIComponent(f.item.streamUrl)}&title=${encodeURIComponent(f.item.title)}&type=${f.item.mediaType}&path=${encodeURIComponent(f.item.path)}`,
    )
  }

  const remove = async (f: FavoriteDto) => {
    try {
      await api.delete('/favorites', { query: { path: f.item.path } })
      setItems((prev) => prev.filter((x) => x.id !== f.id))
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Error al quitar favorito')
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>Favoritos</h1>
        <button type="button" className="btn btn-ghost" onClick={() => void load()}>
          Refrescar
        </button>
      </header>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="muted">Cargando...</div>
      ) : items.length === 0 ? (
        <div className="empty">
          <p>Aún no tenés favoritos.</p>
          <p className="muted">Marcá contenido desde el explorador o la reproducción.</p>
        </div>
      ) : (
        <div className="list">
          {items.map((f) => (
            <div key={f.id} className="list-row">
              <button type="button" className="list-row-main" onClick={() => play(f)}>
                <span className="list-icon">{f.item.mediaType === 'AUDIO' ? '🎵' : '🎬'}</span>
                <span className="list-title">{f.item.title}</span>
                <span className="list-meta">{f.item.contentType}</span>
              </button>
              <button type="button" className="btn btn-danger" onClick={() => void remove(f)}>
                Quitar
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
