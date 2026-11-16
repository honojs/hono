import { UnsupportedPathError } from '../router'

export const createNullObject = () => Object.create(null)

export const checkOptionalParameter = (path: string): string[] | null => {
  /*
    If path is `/api/animals/:type?` it will return:
    [`/api/animals`, `/api/animals/:type`]
    in other cases it will return null
  */

  if (path.charCodeAt(path.length - 1) !== 63 || !path.includes(':')) {
    return null
  }

  const segments = path.split('/')
  const results: string[] = []
  let basePath = ''

  segments.forEach((segment) => {
    if (segment !== '' && !/\:/.test(segment)) {
      basePath += '/' + segment
    } else if (/\:/.test(segment)) {
      if (segment.charCodeAt(segment.length - 1) === 63) {
        if (basePath.endsWith('*')) {
          // the shorter route would turn the wildcard into a trailing one
          throw new UnsupportedPathError(path)
        }
        if (results.length === 0 && basePath === '') {
          results.push('/')
        } else {
          results.push(basePath)
        }
        const optionalSegment = segment.slice(0, -1)
        basePath += '/' + optionalSegment
        results.push(basePath)
      } else {
        basePath += '/' + segment
      }
    }
  })

  return results.filter((v, i, a) => a.indexOf(v) === i)
}
