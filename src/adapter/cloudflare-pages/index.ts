/**
 * @module
 * Cloudflare Pages Adapter for Hono.
 *
 * @deprecated
 * This adapter will be removed from the `hono` package in v5.
 * Cloudflare recommends Workers with static assets; use `hono` on Workers instead.
 */

export { handle, handleMiddleware, serveStatic } from './handler'
export { getConnInfo } from './conninfo'
export type { EventContext } from './handler'
