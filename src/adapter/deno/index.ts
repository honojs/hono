/**
 * @module
 * Deno Adapter for Hono.
 *
 * @deprecated
 * This adapter will be removed from the `hono` package in v5.
 * Install `@hono/deno` and import from there instead.
 */

export { serveStatic } from './serve-static'
export { toSSG, denoFileSystemModule } from './ssg'
export { upgradeWebSocket } from './websocket'
export { getConnInfo } from './conninfo'
