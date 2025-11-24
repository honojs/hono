/**
 * @module
 * Context Storage Middleware for Hono.
 */

import { AsyncLocalStorage } from 'node:async_hooks'
import type { Context } from '../../context'
import type { Env, MiddlewareHandler } from '../../types'

const asyncLocalStorage = new AsyncLocalStorage<Context>()

/**
 * Context Storage Middleware for Hono.
 *
 * @see {@link https://hono.dev/docs/middleware/builtin/context-storage}
 *
 * @returns {MiddlewareHandler} The middleware handler function.
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
 * app.use(contextStorage())
 *
 * app.use(async (c, next) => {
 *   c.set('message', 'Hono is hot!!)
 *   await next()
 * })
 *
 * app.get('/', async (c) => { c.text(getMessage()) })
 *
 * const getMessage = () => {
 *   return getContext<Env>().var.message
 * }
 * ```
 */
export const contextStorage = (): MiddlewareHandler => {
  return async function contextStorage(c, next) {
    await asyncLocalStorage.run(c, next)
  }
}

export const getContextIfAny = <E extends Env = Env>(): Context<E> | undefined => {
  return asyncLocalStorage.getStore() as Context<E> | undefined
}

export const getContext = <E extends Env = Env>(): Context<E> => {
  const context = getContextIfAny<E>()
  if (!context) {
    throw new Error('Context is not available')
  }
  return context
}
