/**
 * `defaultJoin` does not support Windows paths and always uses `/` separators.
 * If you need Windows path support, please use `join` exported from `node:path` etc. instead.
 */
export const defaultJoin = (...paths: string[]): string => {
  // Join non-empty paths with '/'
  let result = paths.filter((p) => p !== '').join('/')

  // Normalize multiple slashes to single slash
  result = result.replace(/(?<=\/)\/+/g, '')

  // Handle path resolution (. and ..)
  const segments = result.split('/')
  const resolved = []

  for (const segment of segments) {
    if (segment === '..' && resolved.length > 0 && resolved.at(-1) !== '..') {
      resolved.pop()
    } else if (segment !== '.') {
      resolved.push(segment)
    }
  }

  return resolved.join('/') || '.'
}
