/**
 * @module
 * Mount Helper for Hono.
 */

import type { Context, ExecutionContext } from '../../context'
import { routePath } from '../../helper/route'
import type { MiddlewareHandler } from '../../types'

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

/**
 * `mount()` allows you to mount applications built with other frameworks into your Hono application.
 *
 * @see {@link https://hono.dev/docs/api/hono#mount}
 *
 * @param {Function} applicationHandler - other Request Handler
 * @param {MountOptions} [options] - options of `mount()`
 * @returns {MiddlewareHandler} handler to register with `app.all()`
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
    : (c) => {
        let executionContext: ExecutionContext | undefined = undefined
        try {
          executionContext = c.executionCtx
        } catch {} // Do nothing
        return [c.env, executionContext]
      }

  const defaultReplaceRequest = (c: Context): Request => {
    // e.g. `/another-app/*` (basePath is already merged) -> `/another-app`
    const pathPrefix = routePath(c).replace(/\/\*$/, '')
    const url = new URL(c.req.raw.url)
    url.pathname = c.req.path.slice(pathPrefix.length) || '/'
    return new Request(url, c.req.raw)
  }

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
