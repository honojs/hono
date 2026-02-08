/**
 * Service Worker Adapter for Hono.
 * @module
 */
import type { Hono } from '../../hono'
import type { Env, Schema } from '../../types'
import { handle } from './handler'
import type { HandleOptions } from './handler'

/**
 * Registers a Hono app to handle fetch events in a service worker.
 * This sets up `addEventListener('fetch', handle(app, options))` for the provided app.
 *
 * @param app - The Hono application instance
 * @param options - Options for handling requests
 * @example
 * ```ts
 * import { Hono } from 'hono'
 * import { fire } from 'hono/service-worker'
 *
 * const app = new Hono()
 *
 * app.get('/', (c) => c.text('Hi'))
 *
 * fire(app)
 * ```
 */
const fire = <E extends Env, S extends Schema, BasePath extends string>(
  app: Hono<E, S, BasePath>,
  options?: HandleOptions
): void => {
  // @ts-expect-error addEventListener is not typed well in ServiceWorker-like contexts, see: https://github.com/microsoft/TypeScript/issues/14877
  addEventListener('fetch', handle(app, options))
}

export { handle, fire }
