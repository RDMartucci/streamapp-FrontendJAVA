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
  search(query: string): Promise<TitleDetail> {
    return api.get<TitleDetail>('/tmdb/search', { query: { q: query } })
  },
  detail(tmdbId: number): Promise<TitleDetail> {
    return api.get<TitleDetail>('/tmdb/detail', { query: { tmdbId: String(tmdbId) } })
  },
  series(tmdbId: number): Promise<TitleDetail> {
    return api.get<TitleDetail>('/tmdb/series', { query: { tmdbId: String(tmdbId) } })
  },
}
