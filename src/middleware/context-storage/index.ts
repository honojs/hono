/**
 * @module
 * Context Storage Middleware for Hono.
 */

import type { Context } from '../../context'
import type { Env } from '../../types'
import { createMiddleware } from '../../helper/factory'
import { AsyncLocalStorage } from 'node:async_hooks'

const asyncLocalStorage = new AsyncLocalStorage<Context>()

/**
 * Context Storage Middleware for Hono.
 *
 * @see {@link https://hono.dev/docs/middleware/builtin/context-storage}
 *
 * @template E - The environment type.
 * @return The context storage object containing the 'setContext' middleware handler.
 *
 * @example
 * ```ts
 * type Env = {
 *   Variables: {
 *     message: string
 *   }
 * }
 *
 * const app = new Hono<Env>()
 *
 * // create the middleware
 * const { setContext, getContext } = contextStorage<Env>()
 *
 * // add the middleware to your router
 * app.use(setContext)
 *
 * app.use(async (c, next) => {
 *   c.set('message', 'Hono is cool!!)
 *   await next()
 * })
 *
 * app.get('/', async (c) => { c.text(getMessage()) })
 *
 * const getMessage = () => {
 *   return getContext().var.message
 * }
 * ```
 */
export const contextStorage = <E extends Env = Env>() => {
  return {
    setContext: createMiddleware(async (c, next) => {
      return asyncLocalStorage.run(c, next)
    }),
    getContext: () => {
      const context = asyncLocalStorage.getStore() as Context<E>
      if (!context) {
        throw new Error('Context is not available')
      }
      return context
    },
  }
}

export const getContext = <E extends Env = Env>() => {
  return contextStorage<E>().getContext()
}
