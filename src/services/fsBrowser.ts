import { api } from '../lib/api'
import type { FsEntry } from '../types'

export const fsBrowserService = {
  roots(): Promise<FsEntry[]> {
    return api.get<FsEntry[]>('/fs/roots')
  },

  list(path: string): Promise<FsEntry[]> {
    return api.get<FsEntry[]>('/fs/list', { query: { path } })
  },
}