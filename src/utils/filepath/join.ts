/**
 * Utility for joining paths.
 * @module
 */

const normalizePath = (path: string): string => {
  return path.replace(/(\\)/g, '/').replace(/\/$/g, '')
}

const handleParent = (resultPaths: string[], beforeParentFlag: boolean): void => {
  if (resultPaths.length === 0 || beforeParentFlag) {
    resultPaths.push('..')
  } else {
    resultPaths.pop()
  }
}


const handleNonDot = (path: string, resultPaths: string[]): void => {
  path = path.replace(/^\.(?!.)/, '')
  if (path !== '') {
    resultPaths.push(path)
  }
}


const handleSegments = (paths: string[], resultPaths: string[]): void => {
  let beforeParentFlag = false
  for (const path of paths) {
    // Handle `..`
    if (path === '..') {
      handleParent(resultPaths, beforeParentFlag)
      beforeParentFlag = true
    } else {
      // Handle `.` or `abc`
      handleNonDot(path, resultPaths)
      beforeParentFlag = false
    }
  }
}

/**
 * Joins multiple paths into one path.
 *
 * It normalizes all paths by removing duplicate slashes and
 * removes empty segments.
 *
 * @param paths Paths to join.
 * @returns Joined path.
 */
export const joinPaths = (...paths: string[]): string => {
  paths = paths.map(normalizePath)
  const resultPaths: string[] = []
  handleSegments(paths.join('/').split('/'), resultPaths)
  return (paths[0][0] === '/' ? '/' : '') + resultPaths.join('/')
}