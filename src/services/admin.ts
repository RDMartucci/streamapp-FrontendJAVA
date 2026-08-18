import { api } from '../lib/api'
import type { AdminDeleteResult, Role, UserDto } from '../types'

export interface CreateUserPayload {
  username: string
  password: string
  role: Role
}

export const adminService = {
  listUsers(): Promise<UserDto[]> {
    return api.get<UserDto[]>('/admin/users')
  },

  createUser(payload: CreateUserPayload): Promise<UserDto> {
    return api.post<UserDto>('/admin/users', payload)
  },

  deleteMedia(path: string): Promise<AdminDeleteResult> {
    return api.delete<AdminDeleteResult>('/admin/media', { query: { path } })
  },
}