import type { Context } from '../context'
import { GET_MATCH_RESULT } from '../request/constants'
import { getPattern, splitRoutingPath, stripPathPrefix } from './url'

const getPathPrefixLength = (c: Context, pathPrefix: string, routePath: string): number => {
  if (!/[:*]/.test(pathPrefix)) {
    return pathPrefix.length
  }

  const path = c.req.path
  const matchResult = c.req[GET_MATCH_RESULT]
  const paramNames = new Set<string>()
  let length = 0
  for (const part of splitRoutingPath(pathPrefix)) {
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
  const url = new URL(c.req.raw.url)
  url.pathname = stripPathPrefix(
    url.pathname,
    c.req.path,
    getPathPrefixLength(c, pathPrefix, routePath)
  )
  return new Request(url, c.req.raw)
}
