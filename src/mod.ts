import { Hono } from './hono'

declare global {
  class ExtendableEvent extends Event {
    constructor(type: string, init?: EventInit)
    waitUntil(promise: Promise<any>): void
  }
  abstract class FetchEvent extends ExtendableEvent {
    readonly request: Request
    respondWith(promise: Response | Promise<Response>): void
    passThroughOnException(): void
  }
  interface ExecutionContext {
    waitUntil(promise: Promise<any>): void
    passThroughOnException(): void
  }
}

export type { Handler, Next, ContextVariableMap } from './hono'
export type { Context } from './context'
export { Hono }

// Router
export { RegExpRouter } from './router/reg-exp-router'
export { TrieRouter } from './router/trie-router'
