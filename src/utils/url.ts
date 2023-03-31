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
const _decodeURI = (value: string) => {
  if (!/[%+]/.test(value)) {
    return value
  }
  if (value.includes('+')) {
    value = value.replace(/\+/g, ' ')
  }
  return value.includes('%') ? decodeURIComponent(value) : value
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
      keyIndex = url.indexOf(`&${key}`, keyIndex)
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
      ;((results[name] ??= []) as string[]).push(value)
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
