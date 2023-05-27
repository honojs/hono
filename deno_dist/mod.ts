import { Hono } from './hono.ts'

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
  Input,
  TypedResponse,
} from './types.ts'
export type { Context, ContextVariableMap } from './context.ts'
export type { HonoRequest } from './request.ts'
export { Hono }
export { HTTPException } from './http-exception.ts'

// Router
export { RegExpRouter } from './router/reg-exp-router/index.ts'
export { TrieRouter } from './router/trie-router/index.ts'
export { SmartRouter } from './router/smart-router/index.ts'
export { PatternRouter } from './router/pattern-router/index.ts'
export { LinearRouter } from './router/linear-router/index.ts'

// Validator
export { validator } from './validator/index.ts'

// Client
export { hc } from './client/index.ts'
export type { InferRequestType, InferResponseType, ClientRequestOptions } from './client/index.ts'
