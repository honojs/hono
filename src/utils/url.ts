const URL_REGEXP = /^https?:\/\/[a-zA-Z0-9\-\.:]+(\/?[^?#]*)/

export type Pattern = readonly [string, string, RegExp | true] | '*'

const splitPathCache: Record<string, string[]> = {}
export const splitPath = (path: string): string[] => {
  let paths = splitPathCache[path]
  if (paths) {
    return paths
  }
  paths = path.split(/\//) // faster than path.split('/')
  if (paths[0] === '') {
    paths.shift()
  }
  splitPathCache[path] = paths
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

type Params = {
  strict: boolean
}

const pathFromURLCache: Record<string, string> = {}
export const getPathFromURL = (url: string, params: Params = { strict: true }): string => {
  // if strict routing is false => `/hello/hey/` and `/hello/hey` are treated the same
  // default is true
  if (params.strict === false && url.endsWith('/')) {
    url = url.slice(0, -1)
  }

  let path = pathFromURLCache[url]
  if (path) return path

  const match = url.match(URL_REGEXP)
  path = match ? match[1] : ''
  pathFromURLCache[url] = path
  return path
}

export const isAbsoluteURL = (url: string): boolean => {
  const match = url.match(URL_REGEXP)
  if (match) {
    return true
  }
  return false
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
