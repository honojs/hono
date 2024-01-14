/**
 * Get dirname
 * @param path File Path
 * @returns Parent dir path
 */
export const dirname = (path: string) => {
  const splitedPath = path.split(/[\/\\]/)
  return splitedPath.slice(0, -1).join('/') // Windows supports slash path
}

export const joinPaths = (...paths: string[]) => {
  paths = paths.map((path) => {
    return path.replace(/(\\)/g, '/').replace(/\/$/g, '')
  })
  const resultPaths: string[] = []
  for (let path of paths.join('/').split('/')) {
    // Handle `..` or `../`
    if (path === '..') {
      if (resultPaths.length === 0) {
        resultPaths.push('..')
      } else {
        resultPaths.pop()
      }
      continue
    } else {
      // Handle `.` or `./`
      path = path.replace(/^\./g, '')
    }
    if (path !== '') {
      resultPaths.push(path)
    }
  }
  return (paths[0][0] === '/' ? '/' : '') + resultPaths.join('/')
}
