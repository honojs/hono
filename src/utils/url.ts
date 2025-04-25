/**
 * @module
 * URL utility.
 */

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
export const getPattern = (label: string, next?: string): Pattern | null => {
  // *            => wildcard
  // :id{[0-9]+}  => ([0-9]+)
  // :id          => (.+)

  if (label === '*') {
    return '*'
  }

  const match = label.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/)
  if (match) {
    const cacheKey = `${label}#${next}`
    if (!patternCache[cacheKey]) {
      if (match[2]) {
        patternCache[cacheKey] =
          next && next[0] !== ':' && next[0] !== '*'
            ? [cacheKey, match[1], new RegExp(`^${match[2]}(?=/${next})`)]
            : [label, match[1], new RegExp(`^${match[2]}$`)]
      } else {
        patternCache[cacheKey] = [label, match[1], true]
      }
    }

    return patternCache[cacheKey]
  }

  return null
}

type Decoder = (str: string) => string
export const tryDecode = (str: string, decoder: Decoder): string => {
  try {
    return decoder(str)
  } catch {
    return str.replace(/(?:%[0-9A-Fa-f]{2})+/g, (match) => {
      try {
        return decoder(match)
      } catch {
        return match
      }
    })
  }
}

/**
 * Try to apply decodeURI() to given string.
 * If it fails, skip invalid percent encoding or invalid UTF-8 sequences, and apply decodeURI() to the rest as much as possible.
 * @param str The string to decode.
 * @returns The decoded string that sometimes contains undecodable percent encoding.
 * @example
 * tryDecodeURI('Hello%20World') // 'Hello World'
 * tryDecodeURI('Hello%20World/%A4%A2') // 'Hello World/%A4%A2'
 */
const tryDecodeURI = (str: string) => tryDecode(str, decodeURI)

export const getPath = (request: Request): string => {
  const url = request.url
  const start = url.indexOf('/', 8)
  let i = start
  for (; i < url.length; i++) {
    const charCode = url.charCodeAt(i)
    if (charCode === 37) {
      // '%'
      // If the path contains percent encoding, use `indexOf()` to find '?' and return the result immediately.
      // Although this is a performance disadvantage, it is acceptable since we prefer cases that do not include percent encoding.
      const queryIndex = url.indexOf('?', i)
      const path = url.slice(start, queryIndex === -1 ? undefined : queryIndex)
      return tryDecodeURI(path.includes('%25') ? path.replace(/%25/g, '%2525') : path)
    } else if (charCode === 63) {
      // '?'
      break
    }
  }
  return url.slice(start, i)
}

export const getQueryStrings = (url: string): string => {
  const queryIndex = url.indexOf('?', 8)
  return queryIndex === -1 ? '' : '?' + url.slice(queryIndex + 1)
}

export const getPathNoStrict = (request: Request): string => {
  const result = getPath(request)

  // if strict routing is false => `/hello/hey/` and `/hello/hey` are treated the same
  return result.length > 1 && result.at(-1) === '/' ? result.slice(0, -1) : result
}

/**
 * Merge paths.
 * @param {string[]} ...paths - The paths to merge.
 * @returns {string} The merged path.
 * @example
 * mergePath('/api', '/users') // '/api/users'
 * mergePath('/api/', '/users') // '/api/users'
 * mergePath('/api', '/') // '/api'
 * mergePath('/api/', '/') // '/api/'
 */
export const mergePath: (...paths: string[]) => string = (
  base: string | undefined,
  sub: string | undefined,
  ...rest: string[]
): string => {
  if (rest.length) {
    sub = mergePath(sub as string, ...rest)
  }
  return `${base?.[0] === '/' ? '' : '/'}${base}${
    sub === '/' ? '' : `${base?.at(-1) === '/' ? '' : '/'}${sub?.[0] === '/' ? sub.slice(1) : sub}`
  }`
}

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

const _getQueryParam = (
  url: string,
  key?: string,
  multiple?: boolean
):
  | string
  | undefined
  | string[]
  | Record<string, string | undefined>
  | Record<string, string[]> => {
  const searchParams = new URLSearchParams(getQueryStrings(url))

  if (key) {
    const params = multiple ? searchParams.getAll(key) : searchParams.get(key)
    return multiple ? (params?.length ? params : undefined) : params ?? undefined
  }

  const result = Array.from(searchParams.keys()).reduce<
    Record<string, string | undefined> | Record<string, string[]>
  >((acc, key) => {
    acc[key] = multiple ? searchParams.getAll(key) : searchParams.get(key) ?? undefined
    return acc
  }, {})

  return result
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
