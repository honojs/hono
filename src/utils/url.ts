const URL_REGEXP = /^(([^:\/?#]+):)?(\/\/([^\/?#]*))?([^?#]*)(\?([^#]*))?(#(.*))?/

export type Pattern = [string, string, RegExp | true] | '*'

export const splitPath = (path: string): string[] => {
  const paths = path.split(/\//) // faster than path.split('/')
  if (paths[0] === '') {
    paths.shift()
  }
  return paths
}

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
    if (match[2]) {
      return [label, match[1], new RegExp('^' + match[2] + '$')]
    } else {
      return [label, match[1], true]
    }
  }
  return null
}

type Params = {
  strict: boolean
}

export const getPathFromURL = (url: string, params: Params = { strict: true }): string => {
  // if strict routing is false => `/hello/hey/` and `/hello/hey` are treated the same
  // default is true
  if (!params.strict && url.endsWith('/')) {
    url = url.slice(0, -1)
  }

  const match = url.match(URL_REGEXP)
  if (match) {
    return match[5]
  }
  return ''
}

export const isAbsoluteURL = (url: string): boolean => {
  const match = url.match(URL_REGEXP)
  if (match && match[1]) {
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
  }

  return p
}
