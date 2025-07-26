const isWindowsPath = (path: string): boolean => {
  return /^[a-zA-Z]:/.test(path) || path.includes('\\')
}

export const defaultJoin = (...paths: string[]): string => {
  if (paths.length === 0) return '.'

  const isWindows = paths.some(isWindowsPath)
  const sep = isWindows ? '\\' : '/'
  const otherSep = isWindows ? '/' : '\\'

  let result = paths[0] || ''

  for (let i = 1; i < paths.length; i++) {
    const segment = paths[i]
    if (!segment) continue

    if (result && !result.endsWith(sep) && !result.endsWith(otherSep)) {
      result += sep
    }
    result += segment
  }

  result = result.replace(/[/\\]+/g, sep)

  if (result.startsWith(`.${sep}`)) {
    result = result.slice(2)
  }

  const segments = result.split(/[/\\]/)
  const resolvedSegments: string[] = []

  let hasRoot = false
  if (segments[0] === '' || /^[a-zA-Z]:$/.test(segments[0])) {
    hasRoot = true
    if (/^[a-zA-Z]:$/.test(segments[0])) {
      resolvedSegments.push(segments[0])
    }
  }

  for (let i = hasRoot ? 1 : 0; i < segments.length; i++) {
    const segment = segments[i]
    if (segment === '.' || segment === '') {
      continue
    } else if (segment === '..') {
      if (
        resolvedSegments.length > 0 &&
        resolvedSegments[resolvedSegments.length - 1] !== '..' &&
        !/^[a-zA-Z]:$/.test(resolvedSegments[resolvedSegments.length - 1])
      ) {
        resolvedSegments.pop()
      } else if (!hasRoot) {
        resolvedSegments.push('..')
      }
    } else {
      resolvedSegments.push(segment)
    }
  }

  let finalPath = resolvedSegments.join(sep)

  if (hasRoot && segments[0] === '') {
    finalPath = sep + finalPath
  }

  if (!finalPath) {
    return hasRoot ? sep : '.'
  }

  return finalPath
}
