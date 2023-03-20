export type Pattern = readonly [string, string, RegExp | true] | '*'

export const splitPath = (path: string): string[] => {
  const paths = path.split('/')
  if (paths[0] === '') {
    paths.shift()
  }
  return paths
}

export const splitRoutingPath = (path: string): string[] => {
  const groups: [string, string][] = [] // [mark, original string]
  for (let i = 0; ; ) {
    let replaced = false
    path = path.replace(/\{[^}]+\}/g, (m) => {
      const mark = `@\\${i}`
      groups[i] = [mark, m]
      i++
      replaced = true
      return mark
    })
    if (!replaced) {
      break
    }
  }

  const paths = path.split('/')
  if (paths[0] === '') {
    paths.shift()
  }
  for (let i = groups.length - 1; i >= 0; i--) {
    const [mark] = groups[i]
    for (let j = paths.length - 1; j >= 0; j--) {
      if (paths[j].indexOf(mark) !== -1) {
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

export const getPathFromURL = (url: string, strict: boolean = true): string => {
  const queryIndex = url.indexOf('?', 8)
  const result = url.substring(url.indexOf('/', 8), queryIndex === -1 ? url.length : queryIndex)

  // if strict routing is false => `/hello/hey/` and `/hello/hey` are treated the same
  // default is true
  if (strict === false && /.+\/$/.test(result)) {
    return result.slice(0, -1)
  }

  return result
}

export const getQueryStringFromURL = (url: string): string => {
  const queryIndex = url.indexOf('?', 8)
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
  const match = path.match(/^(.+|)(\/\:[^\/]+)\?$/)
  if (!match) return null

  const base = match[1]
  const optional = base + match[2]
  return [base === '' ? '/' : base.replace(/\/$/, ''), optional]
}

// Optimized
export const getQueryParam = (
  queryString: string,
  key?: string
): string | null | Record<string, string> => {
  const results: Record<string, string> = {}

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const andIndex = queryString.indexOf('&')
    let strings = ''
    if (andIndex === -1) {
      strings = queryString
    } else {
      strings = queryString.substring(0, andIndex)
    }

    const eqIndex = strings.indexOf('=')
    if (eqIndex !== -1) {
      const v = strings.substring(eqIndex + 1)
      const k = strings.substring(0, eqIndex)
      if (key === k) {
        return /\%/.test(v) ? decodeURI(v) : v
      } else {
        results[k] ||= v
      }
    } else if (strings === key) {
      return ''
    }

    if (andIndex === -1) break
    queryString = queryString.substring(andIndex + 1, queryString.length)
  }

  if (key) return null
  return results
}

export const getQueryParams = (
  queryString: string,
  key?: string
): string[] | null | Record<string, string[]> => {
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
