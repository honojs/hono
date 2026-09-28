/**
 * @module
 * Cloudflare Pages Adapter for Hono.
 *
 * @deprecated
 * This adapter will be removed from the `hono` package in v5.
 * Install `@hono/cloudflare-pages` and import from there instead.
 */

export { handle, handleMiddleware, serveStatic } from './handler'
export { getConnInfo } from './conninfo'
export type { EventContext } from './handler'
