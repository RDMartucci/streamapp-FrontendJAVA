import { api } from '../lib/api'

export const rootsService = {
  list(): Promise<string[]> {
    return api.get<string[]>('/roots')
  },

  add(path: string): Promise<string[]> {
    return api.post<string[]>('/roots', { path })
  },

  remove(path: string): Promise<string[]> {
    return api.delete<string[]>('/roots', { query: { path } })
  },
}