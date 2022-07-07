import { Hono } from './hono.ts'

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

export type { Handler, Next } from './hono.ts'
export { Context } from './context.ts'
export type { Env } from './context.ts'
export { Hono }

// Router
export { RegExpRouter } from './router/reg-exp-router/index.ts'
export { TrieRouter } from './router/trie-router/index.ts'

// Middleware
export * from './middleware/basic-auth/index.ts'
export * from './middleware/bearer-auth/index.ts'
export * from './middleware/body-parse/index.ts'
export * from './middleware/cookie/index.ts'
export * from './middleware/cors/index.ts'
export * from './middleware/etag/index.ts'
export * from './middleware/html/index.ts'
export * from './middleware/jsx/index.ts'
export * from './middleware/jwt/index.ts'
export * from './middleware/logger/index.ts'
export * from './middleware/powered-by/index.ts'
export * from './middleware/pretty-json/index.ts'
export * from './deno/serve-static.ts'
