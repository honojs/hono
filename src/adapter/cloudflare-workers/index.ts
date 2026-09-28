/**
 * @module
 * Cloudflare Workers Adapter for Hono.
 *
 * @deprecated
 * This adapter will be removed from the `hono` package in v5.
 * Install `@hono/cloudflare-workers` and import from there instead.
 */

export { serveStatic } from './serve-static-module'
export { upgradeWebSocket } from './websocket'
export { getConnInfo } from './conninfo'
