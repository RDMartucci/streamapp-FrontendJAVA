import { api } from '../lib/api'
import type { LibraryScanResult, MediaItemDto } from '../types'

export const libraryService = {
  list(): Promise<MediaItemDto[]> {
    return api.get<MediaItemDto[]>('/library/items')
  },

  scan(): Promise<LibraryScanResult> {
    return api.post<LibraryScanResult>('/library/scan')
  },
}
