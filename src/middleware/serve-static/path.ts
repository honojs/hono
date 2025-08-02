/**
 * `defaultJoin` does not support Windows paths and always uses `/` separators.
 * If you need Windows path support, please use `join` exported from `node:path` etc. instead.
 */
export const defaultJoin = (...paths: string[]): string => {
  if (paths.length === 0) {
    return '.'
  }
  if (paths.length === 1 && paths[0] === '') {
    return '.'
  }

  // Join non-empty paths with '/'
  let result = paths.filter((p) => p !== '').join('/')

  // Normalize multiple slashes to single slash
  result = result.replace(/\/+/g, '/')

  // Handle path resolution (. and ..)
  const segments = result.split('/')
  const resolved = []
  const isAbsolute = result.startsWith('/')

  for (const segment of segments) {
    if (segment === '' || segment === '.') {
      continue
    }
    if (segment === '..') {
      if (resolved.length > 0 && resolved[resolved.length - 1] !== '..') {
        resolved.pop()
      } else if (!isAbsolute) {
        resolved.push('..')
      }
    } else {
      resolved.push(segment)
    }
  }

  const final = resolved.join('/')
  return isAbsolute ? '/' + final : final || '.'
}
