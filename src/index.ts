/**
 * @module
 *
 * Hono - Web Framework built on Web Standards
 *
 * @example
 * ```ts
 * import { Hono } from 'hono'
 * const app = new Hono()
 *
 * app.get('/', (c) => c.text('Hono!'))
 *
 * export default app
 * ```
 */

import { Hono } from './hono'
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
export type { Context, ContextVariableMap, ContextRenderer, ExecutionContext } from './context'
export type { HonoRequest } from './request'
export type { InferRequestType, InferResponseType, ClientRequestOptions } from './client'

export { Hono }
