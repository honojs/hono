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

interface ConnInfo {
  readonly localAddr: Deno.Addr
  readonly remoteAddr: Deno.Addr
}

declare module './hono.ts' {
  interface Hono {
    fire(): (req: Request, connInfo?: ConnInfo) => Response | Promise<Response>
  }
}

Hono.prototype.fire = function () {
  return (req: Request, _connInfo?: ConnInfo): Response | Promise<Response> => {
    return this.request(req)
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
export { basicAuth } from './middleware/basic-auth/index.ts'
export { bearerAuth } from './middleware/bearer-auth/index.ts'
export { bodyParse } from './middleware/body-parse/index.ts'
export { cookie } from './middleware/cookie/index.ts'
export { cors } from './middleware/cors/index.ts'
export { etag } from './middleware/etag/index.ts'
export { html } from './middleware/html/index.ts'
export { jsx } from './middleware/jsx/index.ts'
export { jwt } from './middleware/jwt/index.ts'
export { logger } from './middleware/logger/index.ts'
export { poweredBy } from './middleware/powered-by/index.ts'
export { prettyJSON } from './middleware/pretty-json/index.ts'
export { serveStatic } from './deno/serve-static.ts'
