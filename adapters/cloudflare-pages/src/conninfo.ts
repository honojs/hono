import type { GetConnInfo } from 'hono/conninfo'

/**
 * Get connection information from Cloudflare Pages
 * @param c - Context
 * @returns Connection information including remote address
 * @example
 * ```ts
 * import { Hono } from 'hono'
 * import { handle, getConnInfo } from './index'
 *
 * const app = new Hono()
 *
 * app.get('/', (c) => {
 *   const info = getConnInfo(c)
 *   return c.text(`Your IP: ${info.remote.address}`)
 * })
 *
 * export const onRequest = handle(app)
 * ```
 */
export const getConnInfo: GetConnInfo = (c) => ({
  remote: {
    address: c.req.header('cf-connecting-ip'),
  },
})
