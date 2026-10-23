export function parentDirectory(path: string): string | null {
  const separatorIndex = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'))
  if (separatorIndex < 0) return null
  if (separatorIndex === 0) return path.slice(0, 1)
  if (separatorIndex === 2 && /^[a-z]:/i.test(path)) return path.slice(0, 3)
  return path.slice(0, separatorIndex)
}
