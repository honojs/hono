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
export type { Context } from './context'
export { Hono }

// Router
export { RegExpRouter } from './router/reg-exp-router'
export { TrieRouter } from './router/trie-router'
