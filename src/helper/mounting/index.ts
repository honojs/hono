/**
 * @module
 * Mounting Helper for Hono.
 */

import type { Context, ExecutionContext } from '../../context'
import type { MiddlewareHandler } from '../../types'
import { getQueryStrings, mergePath } from '../../utils/url'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Application = (request: Request, ...args: any) => Response | Promise<Response>
type OptionHandler = (c: Context) => unknown
type ToHandlerOptions = {
  optionHandler?: OptionHandler
  basePath?: string
}

/**
 * @param {Application} application - The application handler to be used.
 * @param {ToHandlerOptions} [options] - Optional configurations for the handler.
 * @param {OptionHandler} [options.optionHandler] - A function to handle additional options.
 * @param {string} [options.basePath] - The base path to be used for the application.
 * @returns {MiddlewareHandler} The middleware handler function.
 *
 * @example
 * ```ts
 * const app = new Hono()
 *
 * app.all(
 *   '/another-app/*',
 *   toHandler(anotherApp.fetch, {
 *     basePath: '/another-app',
 *   })
 * )
 * ```
 */
export const toHandler = (
  application: Application,
  options?: ToHandlerOptions
): MiddlewareHandler => {
  return async (c, next) => {
    let executionContext: ExecutionContext | undefined = undefined
    try {
      executionContext = c.executionCtx
    } catch {} // Do nothing

    let applicationOptions: unknown[] = []
    if (options?.optionHandler) {
      const result = options.optionHandler(c)
      applicationOptions = Array.isArray(result) ? result : [result]
    } else {
      applicationOptions = [c.env, executionContext]
    }

    let path: string
    if (options?.basePath) {
      const basePath = mergePath('/', options.basePath)
      const regexp = new RegExp(`^${basePath}`)
      path = c.req.path.replace(regexp, '')
      if (path === '') {
        path = '/'
      }
    } else {
      path = c.req.path
    }

    const queryStrings = getQueryStrings(c.req.url)
    const res = await application(
      new Request(new URL(path + queryStrings, c.req.url), c.req.raw),
      ...applicationOptions
    )

    if (res) {
      return res
    }

    await next()
  }
}
