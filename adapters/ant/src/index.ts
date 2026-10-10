/**
 * @module
 * Ant Adapter for Hono.
 */

export { serveStatic } from './serve-static'
export { antFileSystemModule, toSSG } from './ssg'
export { upgradeWebSocket } from './websocket'
export type { AntUpgradeWebSocketOptions } from './websocket'
export { getConnInfo } from './conninfo'
export { getAntServer } from './server'
