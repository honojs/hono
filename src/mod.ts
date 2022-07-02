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

interface ConnInfo {
  readonly localAddr: Deno.Addr
  readonly remoteAddr: Deno.Addr
}

declare module './hono' {
  interface Hono {
    fire(): (req: Request, connInfo?: ConnInfo) => Response | Promise<Response>
  }
}

Hono.prototype.fire = function () {
  return (req: Request, _connInfo?: ConnInfo): Response | Promise<Response> => {
    return this.request(req)
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
export { basicAuth } from './middleware/basic-auth'
export { bearerAuth } from './middleware/bearer-auth'
export { bodyParse } from './middleware/body-parse'
export { cookie } from './middleware/cookie'
export { cors } from './middleware/cors'
export { etag } from './middleware/etag'
export { html } from './middleware/html'
export { jsx } from './middleware/jsx'
export { jwt } from './middleware/jwt'
export { logger } from './middleware/logger'
export { poweredBy } from './middleware/powered-by'
export { prettyJSON } from './middleware/pretty-json'
