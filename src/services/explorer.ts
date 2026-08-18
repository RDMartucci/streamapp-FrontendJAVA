import { api } from '../lib/api'
import type { ExplorerNode } from '../types'

export const explorerService = {
  list(path?: string): Promise<ExplorerNode[]> {
    return api.get<ExplorerNode[]>('/explorer', {
      query: path ? { path } : {},
    })
  },
}