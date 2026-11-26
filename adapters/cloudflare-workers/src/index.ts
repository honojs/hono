/**
 * @module
 * Cloudflare Workers Adapter for Hono.
 */

export { serveStatic } from './serve-static-module'
export { upgradeWebSocket, createHibernationWebSocket } from './websocket'
export type { HibernationWebSocket, HibernationWebSocketOptions } from './websocket'
export { getConnInfo } from './conninfo'
