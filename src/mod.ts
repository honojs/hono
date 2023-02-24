import { Hono } from './hono'

declare global {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  class ExtendableEvent extends Event {
    constructor(type: string, init?: EventInit)
    waitUntil(promise: Promise<void>): void
  }
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  abstract class FetchEvent extends ExtendableEvent {
    readonly request: Request
    respondWith(promise: Response | Promise<Response>): void
    passThroughOnException(): void
  }
  interface ExecutionContext {
    waitUntil(promise: Promise<void>): void
    passThroughOnException(): void
  }
}

export type {
  Env,
  ErrorHandler,
  Handler,
  MiddlewareHandler,
  Next,
  NotFoundHandler,
  ValidationTargets,
} from './types'
export type { Context, ContextVariableMap } from './context'
export type { HonoRequest } from './request'
export { Hono }

// Router
export { RegExpRouter } from './router/reg-exp-router'
export { TrieRouter } from './router/trie-router'
export { SmartRouter } from './router/smart-router'

// Validator
export { validator } from './validator'

// Client
export { hc } from './client'
export type { InferResponseType } from './client'
