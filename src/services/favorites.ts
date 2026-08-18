import { api } from '../lib/api'
import type { FavoriteDto } from '../types'

export const favoritesService = {
  list(): Promise<FavoriteDto[]> {
    return api.get<FavoriteDto[]>('/favorites')
  },

  add(path: string): Promise<FavoriteDto> {
    return api.post<FavoriteDto>('/favorites', { path })
  },

  remove(path: string): Promise<void> {
    return api.delete<void>('/favorites', { query: { path } })
  },
}