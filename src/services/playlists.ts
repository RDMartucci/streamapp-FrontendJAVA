import { api } from '../lib/api'
import type { PlaylistDto, PlaylistSummaryDto } from '../types'

export const playlistsService = {
  list(): Promise<PlaylistSummaryDto[]> {
    return api.get<PlaylistSummaryDto[]>('/playlists')
  },

  get(id: number): Promise<PlaylistDto> {
    return api.get<PlaylistDto>(`/playlists/${id}`)
  },

  create(name: string): Promise<PlaylistDto> {
    return api.post<PlaylistDto>('/playlists', { name })
  },

  rename(id: number, name: string): Promise<PlaylistDto> {
    return api.put<PlaylistDto>(`/playlists/${id}`, { name })
  },

  remove(id: number): Promise<void> {
    return api.delete<void>(`/playlists/${id}`)
  },

  addItem(id: number, path: string): Promise<PlaylistDto> {
    return api.post<PlaylistDto>(`/playlists/${id}/items`, { path })
  },

  removeItem(id: number, path: string): Promise<PlaylistDto> {
    return api.delete<PlaylistDto>(`/playlists/${id}/items`, { query: { path } })
  },
}