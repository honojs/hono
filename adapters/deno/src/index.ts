/**
 * @module
 * Deno Adapter for Hono.
 */

export { serveStatic } from './serve-static.ts'
export { toSSG, denoFileSystemModule } from './ssg.ts'
export { upgradeWebSocket } from './websocket.ts'
export { getConnInfo } from './conninfo.ts'
