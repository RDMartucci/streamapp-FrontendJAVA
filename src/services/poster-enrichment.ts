import { titleDetailsService, type TitleDetail } from './title-details'

export async function findPoster(title: string, path?: string): Promise<TitleDetail | null> {
  if (!title.trim()) return null
  try {
    return await titleDetailsService.search(title, path)
  } catch {
    return null
  }
}

export function hasPoster(detail: TitleDetail | null): detail is TitleDetail & { posterUrl: string } {
  return Boolean(detail?.posterUrl)
}
