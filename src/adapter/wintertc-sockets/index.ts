/**
 * WinterTC Sockets Adapter for Hono.
 *
 * Serves HTTP/1.1 over sockets that implement the WinterTC Sockets API
 * (https://sockets-api.proposal.wintertc.org/). The API only covers connected sockets,
 * so the runtime is responsible for accepting connections and passing them in.
 *
 * @example
 * ```ts
 * import { Hono } from 'hono'
 * import { createSocketHandler } from 'hono/wintertc-sockets'
 *
 * const app = new Hono()
 * app.get('/', (c) => c.text('Hello!'))
 *
 * const handle = createSocketHandler(app)
 *
 * // e.g. with Deno, whose connections expose `readable` and `writable` streams
 * for await (const conn of Deno.listen({ port: 8787 })) {
 *   const { hostname, port } = conn.remoteAddr as Deno.NetAddr
 *   // IPv6 addresses are bracketed so `getConnInfo()` can tell the port apart
 *   const host = hostname.includes(':') ? `[${hostname}]` : hostname
 *   handle({
 *     readable: conn.readable,
 *     writable: conn.writable,
 *     opened: Promise.resolve({ remoteAddress: `${host}:${port}` }),
 *     close: () => conn.close(),
 *   })
 * }
 * ```
 *
 * @module
 */

export { serveSocket, createSocketHandler } from './handler'
export { getConnInfo } from './conninfo'
export type { ServeSocketOptions, SocketBindings, SocketInfo, WinterTCSocket } from './types'
