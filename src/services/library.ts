import { api } from '../lib/api'
import type { LibraryScanResult, MediaItemDto } from '../types'

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

  scan(): Promise<LibraryScanResult> {
    return api.post<LibraryScanResult>('/library/scan')
  },

  cancelScan(): Promise<LibraryScanCancelResult> {
    return api.post<LibraryScanCancelResult>('/library/scan/cancel')
  },
}
