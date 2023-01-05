export type Pattern = readonly [string, string, RegExp | true] | '*'

export const splitPath = (path: string): string[] => {
  const paths = path.split('/')
  if (paths[0] === '') {
    paths.shift()
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

export const getPathFromURLWithRegExp = (url: string, strict: boolean = true): [string, string] => {
  const regExp = /^https?:\/\/[^/]+(\/[^?]+)\?*([^#]*)$/
  const match = url.match(regExp)

  if (match) {
    if (strict === false && match[1].endsWith('/')) {
      return [match[1].slice(0, -1), match[2]]
    } else {
      return [match[1], match[2]]
    }
  }

  return ['/', '']
}

export const getPathFromURL = (url: string, strict: boolean = true): [string, number] => {
  const queryIndex = url.indexOf('?')
  const result = url.substring(url.indexOf('/', 8), queryIndex === -1 ? url.length : queryIndex)

  // if strict routing is false => `/hello/hey/` and `/hello/hey` are treated the same
  // default is true
  if (strict === false && result.endsWith('/')) {
    return [result.slice(0, -1), queryIndex]
  }

  return [result, queryIndex]
}

export const getQueryStringFromURL = (url: string, queryIndex: number): string => {
  const result = queryIndex !== -1 ? url.slice(queryIndex + 1) : ''
  return result
}

export const mergePath = (...paths: string[]): string => {
  let p: string = ''
  let endsWithSlash = false

  for (let path of paths) {
    /* ['/hey/','/say'] => ['/hey', '/say'] */
    if (p.endsWith('/')) {
      p = p.slice(0, -1)
      endsWithSlash = true
    }

    /* ['/hey','say'] => ['/hey', '/say'] */
    if (!path.startsWith('/')) {
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
  const match = path.match(/(^.+)(\/\:[^\/]+)\?$/)
  if (!match) return null

  const base = match[1]
  const optional = base + match[2]
  return [base, optional]
}

const filterQueryString = (queryString: string): string => {
  const fragIndex = queryString.indexOf('#')
  if (fragIndex !== -1) {
    queryString = queryString.slice(0, fragIndex)
  }
  return queryString
}

// Optimized
export const getQueryParam = (
  queryString: string,
  key?: string
): string | null | Record<string, string> => {
  queryString = filterQueryString(queryString)

  const results: Record<string, string> = {}

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const andIndex = queryString.indexOf('&')
    let strings = ''
    if (andIndex === -1) {
      strings = queryString
    } else {
      strings = queryString.slice(0, andIndex)
    }

    const kv = strings.split('=')

    if (kv.length > 1) {
      const k = kv[0]
      const v = kv[1]
      if (key === k) {
        return v.indexOf('%') !== -1 ? decodeURI(v) : v
      } else {
        results[k] ||= v
      }
    } else if (strings === key) {
      return ''
    }

    if (andIndex === -1) break
    queryString = queryString.slice(andIndex + 1, queryString.length)
  }

  if (key) return null
  return results
}

export const getQueryParams = (
  queryString: string,
  key?: string
): string[] | null | Record<string, string[]> => {
  queryString = filterQueryString(queryString)
  const results: Record<string, string[]> = {}

  for (const strings of queryString.split('&')) {
    let [k, v] = strings.split('=')
    if (v === undefined) v = ''
    results[k] ||= []
    results[k].push(v.indexOf('%') !== -1 ? decodeURI(v) : v)
  }

  if (key) return results[key] ? results[key] : null

  return results
}
