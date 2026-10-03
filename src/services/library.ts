import { api } from '../lib/api'
import type { LibraryPageDto, LibraryScanResult } from '../types'

export const libraryService = {
  list(page = 0, size = 24, query = '', type = 'all'): Promise<LibraryPageDto> {
    return api.get<LibraryPageDto>('/library', {
      query: { page: String(page), size: String(size), q: query, type },
    })
  },

  scan(): Promise<LibraryScanResult> {
    return api.post<LibraryScanResult>('/library/scan')
  },
}
