import { Hono } from './hono'

declare global {
  interface ExecutionContext {
    /**
     * Wait until the provided promise is resolved.
     * @param promise - A promise that resolves to void.
     */
    waitUntil(promise: Promise<void>): void

    /**
     * Allows the function to continue running even after an exception is thrown.
     */
    passThroughOnException(): void
  }
}

/**
 * Types for environment variables, error handlers, handlers, middleware handlers, and more.
 */
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

/**
 * Types for context, context variable map, context renderer, and execution context.
 */
export type { Context, ContextVariableMap, ContextRenderer, ExecutionContext } from './context'

/**
 * Type for HonoRequest.
 */
export type { HonoRequest } from './request'

/**
 * Hono framework for building web applications.
 */
export { Hono }

/**
 * Exception handling for HTTP requests.
 */
export { HTTPException } from './http-exception'

// Router
/**
 * Regular Expression based router.
 */
export { RegExpRouter } from './router/reg-exp-router'

/**
 * Trie based router.
 */
export { TrieRouter } from './router/trie-router'

/**
 * Smart router that chooses the best routing method.
 */
export { SmartRouter } from './router/smart-router'

/**
 * Pattern based router.
 */
export { PatternRouter } from './router/pattern-router'

/**
 * Linear router.
 */
export { LinearRouter } from './router/linear-router'

// Validator
/**
 * Validator for request validation.
 */
export { validator } from './validator'

// Client
/**
 * HTTP client for making requests.
 */
export { hc } from './client'

/**
 * Types for inferring request and response types and client request options.
 */
export type { InferRequestType, InferResponseType, ClientRequestOptions } from './client'
