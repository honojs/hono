import { Hono } from './hono'

declare global {
  interface FetchEvent extends Event {
    readonly request: Request
    respondWith(response: Promise<Response> | Response): Promise<Response>
  }
  interface ExecutionContext {
    waitUntil(promise: Promise<any>): void
    passThroughOnException(): void
  }
}

export type { Handler, Next } from './hono'
export { Context } from './context'
export type { Env } from './context'
export { Hono }

// Router
export { RegExpRouter } from './router/reg-exp-router'
export { TrieRouter } from './router/trie-router'

// Middleware
export * from './middleware/basic-auth'
export * from './middleware/bearer-auth'
export * from './middleware/body-parse'
export * from './middleware/cookie'
export * from './middleware/cors'
export * from './middleware/etag'
export * from './middleware/html'
export * from './middleware/jsx'
export * from './middleware/jwt'
export * from './middleware/logger'
export * from './middleware/powered-by'
export * from './middleware/pretty-json'
export * from './deno/serve-static'
