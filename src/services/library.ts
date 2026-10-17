import { api } from '../lib/api'
import type { LibraryPageDto, LibraryScanResult, MediaItemDto } from '../types'

export interface LibrarySearchFilters {
  actor: string
  director: string
  year: string
  genre: string
  stars: string
}

export interface LibraryFilterOptions {
  actors: string[]
  directors: string[]
  years: number[]
  genres: string[]
  stars: number[]
}

export interface LibraryScanCancelResult {
  cancellationRequested: boolean
}

export const libraryService = {
  items(): Promise<MediaItemDto[]> {
    return api.get<MediaItemDto[]>('/library/items')
  },

  filterOptions(): Promise<LibraryFilterOptions> {
    return api.get<LibraryFilterOptions>('/library/filter-options')
  },

  list(
    page = 0,
    size = 24,
    query = '',
    type = 'all',
    filters: LibrarySearchFilters = { actor: '', director: '', year: '', genre: '', stars: '' },
  ): Promise<LibraryPageDto> {
    return api.get<LibraryPageDto>('/library', {
      query: {
        page: String(page),
        size: String(size),
        q: query,
        type,
        actor: filters.actor,
        director: filters.director,
        year: filters.year,
        genre: filters.genre,
        stars: filters.stars,
      },
    })
  },

  scan(): Promise<LibraryScanResult> {
    return api.post<LibraryScanResult>('/library/scan')
  },

  cancelScan(): Promise<LibraryScanCancelResult> {
    return api.post<LibraryScanCancelResult>('/library/scan/cancel')
  },
}
