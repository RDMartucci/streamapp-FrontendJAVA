import { api } from '../lib/api'
import type { AuthResponse, UserDto } from '../types'

export const authService = {
  login(username: string, password: string): Promise<AuthResponse> {
    return api.post<AuthResponse>('/auth/login', { username, password }, { auth: false })
  },

  register(username: string, password: string): Promise<AuthResponse> {
    return api.post<AuthResponse>('/auth/register', { username, password }, { auth: false })
  },

  me(): Promise<UserDto> {
    return api.get<UserDto>('/auth/me')
  },
}