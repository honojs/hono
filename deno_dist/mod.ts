import { Hono } from './hono.ts'

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
} from './types.ts'
export type { Context, ContextVariableMap, ContextRenderer } from './context.ts'
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
