export type Role = 'ROLE_VISITOR' | 'ROLE_USER' | 'ROLE_ADMIN'

export interface AuthResponse {
  token: string
  username: string
  role: Role
}

export interface UserDto {
  id: number
  username: string
  role: Role
  createdAt?: string
}

export interface RootDto {
  id: number
  path: string
}

export type MediaType = 'AUDIO' | 'VIDEO' | null

export interface ExplorerNode {
  name: string
  path: string
  directory: boolean
  mediaType: MediaType
  playable: boolean
  sizeBytes?: number
  lastModified?: string
  streamUrl?: string
}

export interface MediaItemDto {
  id: number
  title: string
  path: string
  mediaType: 'AUDIO' | 'VIDEO'
  contentType: string
  size: number
  lastModified: string
  streamUrl: string
}

export interface FavoriteDto {
  id: number
  item: MediaItemDto
  createdAt: string
}

export interface PlaylistSummaryDto {
  id: number
  name: string
  createdAt: string
  itemCount: number
}

export interface PlaylistDto {
  id: number
  name: string
  createdAt: string
  items: MediaItemDto[]
}

export interface AdminDeleteResult {
  path: string
  filesDeleted: number
  catalogItemsRemoved: number
}

export interface FsEntry {
  name: string
  path: string
}

export interface ApiError {
  error: string
  message: string
  timestamp?: string
  fields?: Record<string, string>
}
