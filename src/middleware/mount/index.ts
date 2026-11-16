/**
 * @module
 * Mount Helper for Hono.
 */

import type { Context, ExecutionContext } from '../../context'
import { routePath } from '../../helper/route'
import { GET_MATCH_RESULT } from '../../request/constants'
import type { MiddlewareHandler } from '../../types'
import { getPattern, splitRoutingPath } from '../../utils/url'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ApplicationHandler = (request: Request, ...args: any) => Response | Promise<Response>
type MountOptionHandler = (c: Context) => unknown
type MountReplaceRequest = (originalRequest: Request) => Request
type MountOptions =
  | MountOptionHandler
  | {
      optionHandler?: MountOptionHandler
      replaceRequest?: MountReplaceRequest | false
    }

const getPathPrefixLength = (c: Context, pathPrefix: string): number => {
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
        throw new Error(`mount(): Duplicate path parameter "${name}" in "${routePath(c)}".`)
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

const defaultReplaceRequest = (c: Context): Request => {
  // e.g. `/another-app/*` (basePath is already merged) -> `/another-app`
  const pathPrefix = routePath(c).replace(/\/?\*$/, '')
  const url = new URL(c.req.raw.url)
  url.pathname = c.req.path.slice(getPathPrefixLength(c, pathPrefix)) || '/'
  return new Request(url, c.req.raw)
}

const defaultGetOptions = (c: Context): unknown[] => {
  let executionContext: ExecutionContext | undefined = undefined
  try {
    executionContext = c.executionCtx
  } catch {} // Do nothing
  return [c.env, executionContext]
}

/**
 * `mount()` allows you to mount applications built with other frameworks into your Hono application.
 *
 * @see {@link https://hono.dev/docs/api/hono#mount}
 *
 * @param {Function} applicationHandler - other Request Handler
 * @param {MountOptions} [options] - options of `mount()`
 * @returns {MiddlewareHandler} handler to register with `app.all()`
 * @throws {Error} If automatic request rewriting encounters duplicate path parameter names.
 *
 * @example
 * ```ts
 * import { Router as IttyRouter } from 'itty-router'
 * import { Hono } from 'hono'
 * import { mount } from 'hono/mount'
 * // Create itty-router application
 * const ittyRouter = IttyRouter()
 * // GET /itty-router/hello
 * ittyRouter.get('/hello', () => new Response('Hello from itty-router'))
 *
 * const app = new Hono()
 * app.all('/itty-router/*', mount(ittyRouter.handle))
 * ```
 *
 * @example
 * ```ts
 * const app = new Hono()
 * // Send the request to another application without modification.
 * app.all('/app/*', mount(anotherApp, {
 *   replaceRequest: (req) => req,
 * }))
 * ```
 */
export const mount = (
  applicationHandler: ApplicationHandler,
  options?: MountOptions
): MiddlewareHandler => {
  // handle options
  let replaceRequest: MountReplaceRequest | undefined
  let optionHandler: MountOptionHandler | undefined
  if (options) {
    if (typeof options === 'function') {
      optionHandler = options
    } else {
      optionHandler = options.optionHandler
      if (options.replaceRequest === false) {
        replaceRequest = (request) => request
      } else {
        replaceRequest = options.replaceRequest
      }
    }
  }

  // prepare handlers for request
  const getOptions: (c: Context) => unknown[] = optionHandler
    ? (c) => {
        const options = optionHandler!(c)
        return Array.isArray(options) ? options : [options]
      }
    : defaultGetOptions

  return async (c, next) => {
    const request = replaceRequest ? replaceRequest(c.req.raw) : defaultReplaceRequest(c)
    const res = await applicationHandler(request, ...getOptions(c))

    if (res) {
      return res
    }

    await next()
  }
}

export type { ApplicationHandler, MountOptionHandler, MountReplaceRequest, MountOptions }
