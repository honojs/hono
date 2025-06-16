import type { Context } from '../../context'
import { GET_MATCH_RESULT } from '../../request/constants'
import type { RouterRoute } from '../../types'
import { getPattern, splitRoutingPath } from '../../utils/url'

/**
 * Get matched routes in the handler
 *
 * @param {Context} c - The context object
 * @returns An array of matched routes
 *
 * @example
 * ```ts
 * import { matchedRoutes } from 'hono/route'
 *
 * app.use('*', async function logger(c, next) {
 *   await next()
 *   matchedRoutes(c).forEach(({ handler, method, path }, i) => {
 *     const name = handler.name || (handler.length < 2 ? '[handler]' : '[middleware]')
 *     console.log(
 *       method,
 *       ' ',
 *       path,
 *       ' '.repeat(Math.max(10 - path.length, 0)),
 *       name,
 *       i === c.req.routeIndex ? '<- respond from here' : ''
 *     )
 *   })
 * })
 * ```
 */
export const matchedRoutes = (c: Context): RouterRoute[] =>
  c.req[GET_MATCH_RESULT][0].map(([[, route]]) => route)

/**
 * Get the route path registered within the handler
 *
 * @param {Context} c - The context object
 * @returns The route path registered within the handler
 *
 * @example
 * ```ts
 * import { routePath } from 'hono/route'
 *
 * app.get('/posts/:id', (c) => {
 *   return c.text(routePath(c)) // '/posts/:id'
 * })
 * ```
 */
export const routePath = (c: Context): string => matchedRoutes(c)[c.req.routeIndex].path

/**
 * Get the basePath of the as-is route specified by routing.
 *
 * @param {Context} c - The context object
 * @returns The basePath of the as-is route specified by routing.
 *
 * @example
 * ```ts
 * import { baseRoutePath } from 'hono/route'
 *
 * const app = new Hono()
 *
 * const subApp = new Hono()
 * subApp.get('/posts/:id', (c) => {
 *   return c.text(baseRoutePath(c)) // '/:sub'
 * })
 *
 * app.route('/:sub', subApp)
 * ```
 */
export const baseRoutePath = (c: Context): string => matchedRoutes(c)[c.req.routeIndex].basePath

/**
 * Get the basePath with embedded parameters
 *
 * @param {Context} c - The context object
 * @returns The basePath with embedded parameters.
 *
 * @example
 * ```ts
 * import { basePath } from 'hono/route'
 *
 * const app = new Hono()
 *
 * const subApp = new Hono()
 * subApp.get('/posts/:id', (c) => {
 *   return c.text(basePath(c)) // '/requested-sub-app-path'
 * })
 *
 * app.route('/:sub', subApp)
 * ```
 */
const basePathCacheMap: WeakMap<Context, string[]> = new WeakMap()
export const basePath = (c: Context): string => {
  const routeIndex = c.req.routeIndex

  const cache = basePathCacheMap.get(c) || []
  if (typeof cache[routeIndex] === 'string') {
    return cache[routeIndex]
  }

  let result: string
  const rp = baseRoutePath(c)
  if (!/[:*]/.test(rp)) {
    result = rp
  } else {
    const paths = splitRoutingPath(rp)

    const reqPath = c.req.path
    let basePathLength = 0
    for (let i = 0, len = paths.length; i < len; i++) {
      const pattern = getPattern(paths[i], paths[i + 1])
      if (pattern) {
        const re = pattern[2] === true || pattern === '*' ? /[^\/]+/ : pattern[2]
        basePathLength += reqPath.substring(basePathLength + 1).match(re)?.[0].length || 0
      } else {
        basePathLength += paths[i].length
      }
      basePathLength += 1 // for '/'
    }
    result = reqPath.substring(0, basePathLength)
  }

  cache[routeIndex] = result
  basePathCacheMap.set(c, cache)

  return result
}
