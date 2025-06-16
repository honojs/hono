/**
 * Service Worker Adapter for Hono.
 * @module
 */
import type { Hono } from '../../hono'
import { handle } from './handler'

/**
 * Registers a Hono app to handle fetch events in a service worker.
 * This sets up `addEventListener('fetch', handle(app))` for the provided app.
 *
 * @param app - The Hono application instance
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
const fire = (app: Hono): void => {
  // @ts-expect-error addEventListener is not typed well
  addEventListener('fetch', handle(app))
}

export { handle, fire }
