const ROOT_COLORS = ['#55c2ff', '#ff8a65', '#a78bfa', '#65d69a', '#f4c95d'] as const

export function getRootColor(index: number): string | undefined {
  return ROOT_COLORS[index]
}

export function getRootColorForPath(path: string, roots: string[]): string | undefined {
  const normalizedPath = normalizePath(path)
  const matchingRoot = roots
    .map((root, index) => ({ root: normalizePath(root), index }))
    .filter(({ root }) => normalizedPath === root || normalizedPath.startsWith(`${root}\\`))
    .sort((left, right) => right.root.length - left.root.length)[0]

  return matchingRoot ? getRootColor(matchingRoot.index) : undefined
}

function normalizePath(path: string): string {
  return path.trim().replace(/\//g, '\\').replace(/\\+$/, '').toLocaleLowerCase()
}
