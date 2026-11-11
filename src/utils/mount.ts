import type { Context } from '../context'
import { HTTPException } from '../http-exception'
import { GET_MATCH_RESULT } from '../request/constants'
import { getPattern, splitRoutingPath, tryDecode } from './url'

const countTrailingSlashes = (path: string): number => {
  let index = path.length
  while (index > 0 && path.charCodeAt(index - 1) === 47) {
    index--
  }
  return path.length - index
}

const getPathPrefixLength = (c: Context, pathPrefix: string, routePath: string): number => {
  if (!/[:*]/.test(pathPrefix)) {
    return pathPrefix.length
  }

  const path = c.req.path
  const matchResult = c.req[GET_MATCH_RESULT]
  const paramNames = new Set<string>()
  let length = 0
  for (const part of splitRoutingPath(pathPrefix)) {
    if (part[0] === ':' && part.endsWith('}?')) {
      throw new Error(
        `mount(): Optional regular expression parameters are not supported in "${routePath}".`
      )
    }
    const pattern = getPattern(part)
    if (pattern && pattern !== '*') {
      const name = pattern[1]
      if (paramNames.has(name)) {
        throw new Error(`mount(): Duplicate path parameter "${name}" in "${routePath}".`)
      }
      paramNames.add(name)
    }
    if (pattern && pattern !== '*' && pattern[2] !== true) {
      const value =
        matchResult.length === 2
          ? matchResult[1][matchResult[0][c.req.routeIndex][1][pattern[1]]]
          : matchResult[0][c.req.routeIndex][1][pattern[1]]
      length += value.length + 1
    } else if (pattern || part.endsWith('*')) {
      const end = path.indexOf('/', length + 1)
      length = end === -1 ? path.length : end
    } else {
      length += part.length + 1
    }
  }
  return length
}

export const createMountedRequest = (
  c: Context,
  pathPrefix: string,
  routePath: string
): Request => {
  if (/[^/]\*$/.test(routePath)) {
    throw new Error(`mount(): Wildcard must follow "/" in "${routePath}".`)
  }
  const prefixLength = getPathPrefixLength(c, pathPrefix, routePath)
  const path = c.req.path.slice(prefixLength) || '/'
  // URL parsing removes dot segments, so the child would not see the path the parent routed.
  if (
    prefixLength > c.req.path.length ||
    path[0] !== '/' ||
    /\/(?:\.|%2e){1,2}(?:\/|$)/i.test(path)
  ) {
    throw new HTTPException(400, { message: 'Invalid mounted path' })
  }

  const rawUrl = c.req.raw.url
  // The URL parser ends the authority at "?", "#" or "\", but routing reads the path from the first "/".
  if (/^[^/?#]*\/\/[^/?#\\]*[?#\\]/.test(rawUrl)) {
    throw new HTTPException(400, { message: 'Invalid mounted path' })
  }

  // URL parsing turns backslashes into slashes.
  const rawPathEnd = rawUrl.search(/[?#]/)
  const rawTrailingSlashes = countTrailingSlashes(
    rawPathEnd === -1 ? rawUrl : rawUrl.slice(0, rawPathEnd)
  )
  // A non-strict parent removed one slash. Forwarding the rest would let a
  // non-strict child remove another slash after the parent's authorization check.
  if (rawTrailingSlashes > 1 && countTrailingSlashes(c.req.path) === rawTrailingSlashes - 1) {
    throw new HTTPException(400, { message: 'Invalid mounted path' })
  }

  const url = new URL(rawUrl)
  // URL parsing treats backslashes as separators and removes tabs and line breaks.
  url.pathname = path.replace(/[\\\t\n\r]/g, encodeURIComponent)
  if (path.includes('%')) {
    try {
      decodeURI(path)
    } catch {
      // Invalid UTF-8 can prevent adjacent encoded characters from decoding.
      const reparsedPath = tryDecode(url.pathname, (value) =>
        decodeURI(value.replace(/%25/g, '%2525'))
      )
      if (reparsedPath !== path) {
        throw new HTTPException(400, { message: 'Invalid mounted path' })
      }
    }
  }
  return new Request(url, c.req.raw)
}
