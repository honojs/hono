/**
 * @module
 * Bun Adapter for Hono.
 *
 * @deprecated
 * This adapter will be removed from the `hono` package in v5.
 * Install `@hono/bun` and import from there instead.
 */

export { serveStatic } from './serve-static'
export { bunFileSystemModule, toSSG } from './ssg'
export { createBunWebSocket, upgradeWebSocket, websocket } from './websocket'
export type { BunWebSocketData, BunWebSocketHandler } from './websocket'
export { getConnInfo } from './conninfo'
export { getBunServer } from './server'
