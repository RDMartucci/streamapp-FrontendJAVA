import { api } from '../lib/api'

export interface TitleDetail {
  title: string
  titleOriginal: string
  year: number | null
  genres: string
  overview: string
  cast: string
  directors: string
  trailerUrl: string
  posterUrl: string | null
  mediaType: 'movie' | 'series'
  tmdbId: number
}

export const titleDetailsService = {
  async search(query: string): Promise<TitleDetail | null> {
    const res = await api.get<TitleDetail | null>('/tmdb/search', { query: { q: query } })
    return (res as TitleDetail | null) ?? null
  },
  detail(tmdbId: number): Promise<TitleDetail> {
    return api.get<TitleDetail>('/tmdb/detail', { query: { tmdbId: String(tmdbId) } })
  },
  series(tmdbId: number): Promise<TitleDetail> {
    return api.get<TitleDetail>('/tmdb/series', { query: { tmdbId: String(tmdbId) } })
  },
  savePoster(path: string, posterUrl: string): Promise<void> {
    return api.put<void>('/poster/by-path', { path, posterUrl })
  },
}
