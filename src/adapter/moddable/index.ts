/**
 * Moddable adapter for Hono
 * @module
 */

import './patch'
// @ts-expect-error Runtime API
import { Socket } from 'socket'
import type { HandleFunction } from './handler'
import { createHandleFunction } from './handler'
export { Handler } from './handler'
export { getConnInfo } from './conninfo'

/**
 * Create a callback function passed to TCP Server
 * @param app Hono app or an object which has `fetch` method.
 * @param port
 * @returns a handler passed to TCP Server
 * @example
 * ```ts
 * import { Hono } from 'hono'
 * import { handle } from 'hono/moddable'
 * import { Listener } from 'socket'
 *
 * const app = new Hono()
 * app.get('/', c => c.text('Hello Hono on moddable!'))
 *
 * const listener = new Listener({ port: 3000 })
 * listener.callback = handle(app)
 * trace('Server is running on http://localhost:3000')
 * ```
 */
export const handle: HandleFunction = createHandleFunction(Socket)
