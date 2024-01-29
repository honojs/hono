export type Pattern = readonly [string, string, RegExp | true] | '*'

export const splitPath = (path: string): string[] => {
  const paths = path.split('/')
  if (paths[0] === '') {
    paths.shift()
  }
  return paths
}

export const splitRoutingPath = (routePath: string): string[] => {
  const { groups, path } = extractGroupsFromPath(routePath)

  const paths = splitPath(path)
  return replaceGroupMarks(paths, groups)
}

const extractGroupsFromPath = (path: string): { groups: [string, string][]; path: string } => {
  const groups: [string, string][] = []

  path = path.replace(/\{[^}]+\}/g, (match, index) => {
    const mark = `@${index}`
    groups.push([mark, match])
    return mark
  })

  return { groups, path }
}

const replaceGroupMarks = (paths: string[], groups: [string, string][]): string[] => {
  for (let i = groups.length - 1; i >= 0; i--) {
    const [mark] = groups[i]

    for (let j = paths.length - 1; j >= 0; j--) {
      if (paths[j].includes(mark)) {
        paths[j] = paths[j].replace(mark, groups[i][1])
        break
      }
    }
  }

  return paths
}

const patternCache: { [key: string]: Pattern } = {}
export const getPattern = (label: string): Pattern | null => {
  // *            => wildcard
  // :id{[0-9]+}  => ([0-9]+)
  // :id          => (.+)
  //const name = ''

  if (label === '*') {
    return '*'
  }

  const match = label.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/)
  if (match) {
    if (!patternCache[label]) {
      if (match[2]) {
        patternCache[label] = [label, match[1], new RegExp('^' + match[2] + '$')]
      } else {
        patternCache[label] = [label, match[1], true]
      }
    }

    return patternCache[label]
  }

  return null
}

export const getPath = (request: Request): string => {
  // Optimized: RegExp is faster than indexOf() + slice()
  const match = request.url.match(/^https?:\/\/[^/]+(\/[^?]*)/)
  return match ? match[1] : ''
}

export const getQueryStrings = (url: string): string => {
  const queryIndex = url.indexOf('?', 8)
  return queryIndex === -1 ? '' : '?' + url.slice(queryIndex + 1)
}

export const getPathNoStrict = (request: Request): string => {
  const result = getPath(request)

  // if strict routing is false => `/hello/hey/` and `/hello/hey` are treated the same
  return result.length > 1 && result[result.length - 1] === '/' ? result.slice(0, -1) : result
}

export const mergePath = (...paths: string[]): string => {
  let p: string = ''
  let endsWithSlash = false

  for (let path of paths) {
    /* ['/hey/','/say'] => ['/hey', '/say'] */
    if (p[p.length - 1] === '/') {
      p = p.slice(0, -1)
      endsWithSlash = true
    }

    /* ['/hey','say'] => ['/hey', '/say'] */
    if (path[0] !== '/') {
      path = `/${path}`
    }

    /* ['/hey/', '/'] => `/hey/` */
    if (path === '/' && endsWithSlash) {
      p = `${p}/`
    } else if (path !== '/') {
      p = `${p}${path}`
    }

    /* ['/', '/'] => `/` */
    if (path === '/' && p === '') {
      p = '/'
    }
  }

  return p
}

export const checkOptionalParameter = (path: string): string[] | null => {
  /*
   If path is `/api/animals/:type?` it will return:
   [`/api/animals`, `/api/animals/:type`]
   in other cases it will return null
  */

  if (!path.match(/\:.+\?$/)) {
    return null
  }

  const segments = path.split('/')
  const results: string[] = []
  let basePath = ''

  segments.forEach((segment) => {
    if (segment !== '' && !/\:/.test(segment)) {
      basePath += '/' + segment
    } else if (/\:/.test(segment)) {
      if (/\?/.test(segment)) {
        if (results.length === 0 && basePath === '') {
          results.push('/')
        } else {
          results.push(basePath)
        }
        const optionalSegment = segment.replace('?', '')
        basePath += '/' + optionalSegment
        results.push(basePath)
      } else {
        basePath += '/' + segment
      }
    }
  })

  return results.filter((v, i, a) => a.indexOf(v) === i)
}

// Optimized
const _decodeURI = (value: string) => {
  if (!/[%+]/.test(value)) {
    return value
  }
  if (value.indexOf('+') !== -1) {
    value = value.replace(/\+/g, ' ')
  }
  return /%/.test(value) ? decodeURIComponent_(value) : value
}

const _getQueryParam = (
  url: string,
  key?: string,
  multiple?: boolean
): string | undefined | Record<string, string> | string[] | Record<string, string[]> => {
  let encoded

  if (!multiple && key && !/[%+]/.test(key)) {
    // optimized for unencoded key

    let keyIndex = url.indexOf(`?${key}`, 8)
    if (keyIndex === -1) {
      keyIndex = url.indexOf(`&${key}`, 8)
    }
    while (keyIndex !== -1) {
      const trailingKeyCode = url.charCodeAt(keyIndex + key.length + 1)
      if (trailingKeyCode === 61) {
        const valueIndex = keyIndex + key.length + 2
        const endIndex = url.indexOf('&', valueIndex)
        return _decodeURI(url.slice(valueIndex, endIndex === -1 ? undefined : endIndex))
      } else if (trailingKeyCode == 38 || isNaN(trailingKeyCode)) {
        return ''
      }
      keyIndex = url.indexOf(`&${key}`, keyIndex + 1)
    }

    encoded = /[%+]/.test(url)
    if (!encoded) {
      return undefined
    }
    // fallback to default routine
  }

  const results: Record<string, string> | Record<string, string[]> = {}
  encoded ??= /[%+]/.test(url)

  let keyIndex = url.indexOf('?', 8)
  while (keyIndex !== -1) {
    const nextKeyIndex = url.indexOf('&', keyIndex + 1)
    let valueIndex = url.indexOf('=', keyIndex)
    if (valueIndex > nextKeyIndex && nextKeyIndex !== -1) {
      valueIndex = -1
    }
    let name = url.slice(
      keyIndex + 1,
      valueIndex === -1 ? (nextKeyIndex === -1 ? undefined : nextKeyIndex) : valueIndex
    )
    if (encoded) {
      name = _decodeURI(name)
    }

    keyIndex = nextKeyIndex

    if (name === '') {
      continue
    }

    let value
    if (valueIndex === -1) {
      value = ''
    } else {
      value = url.slice(valueIndex + 1, nextKeyIndex === -1 ? undefined : nextKeyIndex)
      if (encoded) {
        value = _decodeURI(value)
      }
    }

    if (multiple) {
      if (!(results[name] && Array.isArray(results[name]))) {
        results[name] = []
      }
      ;(results[name] as string[]).push(value)
    } else {
      results[name] ??= value
    }
  }

  return key ? results[key] : results
}

export const getQueryParam: (
  url: string,
  key?: string
) => string | undefined | Record<string, string> = _getQueryParam as (
  url: string,
  key?: string
) => string | undefined | Record<string, string>

export const getQueryParams = (
  url: string,
  key?: string
): string[] | undefined | Record<string, string[]> => {
  return _getQueryParam(url, key, true) as string[] | undefined | Record<string, string[]>
}

// `decodeURIComponent` is a long name.
// By making it a function, we can use it commonly when minified, reducing the amount of code.
export const decodeURIComponent_ = decodeURIComponent
