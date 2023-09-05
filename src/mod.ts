import { Hono } from './hono'

declare global {
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
  Schema,
  ToSchema,
  TypedResponse,
} from './types'
export type { Context, ContextVariableMap, ContextRenderer } from './context'
export type { HonoRequest } from './request'
export { Hono }
export { HTTPException } from './http-exception'

// Router
export { RegExpRouter } from './router/reg-exp-router'
export { TrieRouter } from './router/trie-router'
export { SmartRouter } from './router/smart-router'
export { PatternRouter } from './router/pattern-router'
export { LinearRouter } from './router/linear-router'

// Validator
export { validator } from './validator'

// Client
export { hc } from './client'
export type { InferRequestType, InferResponseType, ClientRequestOptions } from './client'
