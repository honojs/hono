import type { Context } from './context.ts'

export interface ContextVariableMap {}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Bindings = Record<string, any> // For Cloudflare Workers
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Variables = Record<string, any> // For c.set/c.get functions
export type Environment = {
  Bindings: Bindings
  Variables: Variables
}

export type Handler<
  P extends string = string,
  E extends Partial<Environment> = Environment,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  S = any
> = (c: Context<P, E, S>, next: Next) => Response | Promise<Response | undefined | void>

export type MiddlewareHandler<
  P extends string = string,
  E extends Partial<Environment> = Environment,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  S = any
> = (c: Context<P, E, S>, next: Next) => Promise<Response | undefined | void>

export type NotFoundHandler<E extends Partial<Environment> = Environment> = (
  c: Context<string, E>
) => Response | Promise<Response>

export type ErrorHandler<E extends Partial<Environment> = Environment> = (
  err: Error,
  c: Context<string, E>
) => Response

export type Next = () => Promise<void>

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type ParamKeyName<NameWithPattern> = NameWithPattern extends `${infer Name}{${infer _Pattern}`
  ? Name
  : NameWithPattern

type ParamKey<Component> = Component extends `:${infer NameWithPattern}?`
  ? ParamKeyName<NameWithPattern>
  : Component extends `:${infer NameWithPattern}`
  ? ParamKeyName<NameWithPattern>
  : never

export type ParamKeys<Path> = Path extends `${infer Component}/${infer Rest}`
  ? ParamKey<Component> | ParamKeys<Rest>
  : ParamKey<Path>

// This is not used for internally
// Will be used by users as `Handler`
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface CustomHandler<P = string, E = Partial<Environment>, S = any> {
  (
    c: Context<
      P extends string ? P : string,
      P extends Partial<Environment> ? P : E extends Partial<Environment> ? E : never,
      P extends string
        ? E extends Partial<Environment>
          ? S
          : P extends Partial<Environment>
          ? E
          : never
        : P extends Partial<Environment>
        ? E extends Partial<Environment>
          ? S
          : E
        : P
    >,
    next: Next
  ): Response | Promise<Response | undefined | void>
}

export interface ExecutionContext {
  waitUntil(promise: Promise<void>): void
  passThroughOnException(): void
}
