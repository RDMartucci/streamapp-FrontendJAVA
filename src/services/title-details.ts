import { api } from '../lib/api'

export interface SeasonDto {
  seasonNumber: number
  name: string
  episodeCount: number
  airDate: string | null
  posterUrl: string | null
  overview: string
}

export interface EpisodeDto {
  episodeNumber: number
  name: string
  overview: string
  airDate: string | null
  stillUrl: string | null
  voteAverage: number | null
}

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
  voteAverage: number | null
  seasons: SeasonDto[] | null
  runtime: number | null
  countries: string | null
  studios: string | null
  releaseDate: string | null
  backdropUrl: string | null
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
  savePoster(path: string, detail: TitleDetail): Promise<void> {
    console.log('Saving poster for path:', path, 'with detail:', detail)
    
    return api.put<void>('/poster/by-path', {
      path,
      posterUrl: detail.posterUrl ?? '',
      year: detail.year != null ? String(detail.year) : '',
      genres: detail.genres ?? '',
      voteAverage: detail.voteAverage != null ? String(detail.voteAverage) : '',
      titleOriginal: detail.titleOriginal ?? '',
      overview: detail.overview ?? '',
      mediaType: detail.mediaType ?? '',
    })
  },
  searchList(query: string): Promise<TitleDetail[]> {
    return api.get<TitleDetail[]>('/tmdb/search-list', { query: { q: query } })
  },
  season(tmdbId: number, season: number): Promise<EpisodeDto[]> {
    return api.get<EpisodeDto[]>('/tmdb/season', { query: { tmdbId: String(tmdbId), season: String(season) } })
  },
}
