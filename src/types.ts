import type { Context } from './context'
import type { Hono } from './hono'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Bindings = Record<string, any> // For Cloudflare Workers
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Variables = Record<string, any> // For c.set/c.get functions
export type Environment = {
  Bindings: Bindings
  Variables: Variables
}
type Env = Partial<Environment>

export type Handler<
  P extends string = string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _ extends string = string,
  E extends Env = Env,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  S = any, // should be any
  T = unknown
> = (
  c: Context<P, E, S>,
  next: Next
) => Response | Promise<Response | undefined | void> | TypeResponse<T> | Promise<TypeResponse<T>>

export interface HandlerInterface<
  E extends Env = Env,
  P extends string = string,
  M extends string = string,
  S = unknown,
  T = unknown,
  U = Hono<E, P, S, T>
> {
  // app.get(handler...)
  <Path extends string, S2 = S, E2 extends Env = E>(
    ...handlers: Handler<ParamKeys<Path> extends never ? string : ParamKeys<Path>, M, E2, S2>[]
  ): Hono<E2, Path, S2 & S>
  (...handlers: Handler<P, M, E, S, T>[]): U

  // app.get('/', handler, handler...)
  <Path extends string, S2 = S, T2 = unknown, E2 extends Env = E>(
    path: Path,
    ...handlers: Handler<ParamKeys<Path> extends never ? string : ParamKeys<Path>, M, E2, S2, T2>[]
  ): Hono<E2, Path, S2 & S, ExtractData<ReturnType<typeof handlers[-1]>, T2>>
  (path: string, ...handlers: Handler<P, M, E, S, T>[]): U
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type ParamKeyName<NameWithPattern> = NameWithPattern extends `${infer Name}{${infer _Pattern}`
  ? Name
  : NameWithPattern

type ParamKey<Component> = Component extends `:${infer NameWithPattern}`
  ? ParamKeyName<NameWithPattern>
  : never

export type ParamKeys<Path> = Path extends `${infer Component}/${infer Rest}`
  ? ParamKey<Component> | ParamKeys<Rest>
  : ParamKey<Path>

export type ExtractData<T, U> = T extends TypeResponse<infer R>
  ? R
  : T extends Promise<TypeResponse<infer R2>>
  ? R2
  : U

export type MiddlewareHandler<
  P extends string = string,
  E extends Env = Env,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  S = unknown
> = (c: Context<P, E, S>, next: Next) => Promise<Response | undefined | void>

export type NotFoundHandler<E extends Env = Env> = (
  c: Context<string, E>
) => Response | Promise<Response>

export type ErrorHandler<E extends Env = Env> = (err: Error, c: Context<string, E>) => Response

export type Next = () => Promise<void>

// This is not used for internally
// Will be used by users as `Handler`
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface CustomHandler<P = string, E = Env, S = any> {
  (
    c: Context<
      P extends string ? P : string,
      P extends Env ? P : E extends Env ? E : never,
      P extends string
        ? E extends Env
          ? S
          : P extends Env
          ? E
          : never
        : P extends Env
        ? E extends Env
          ? S
          : E
        : P
    >,
    next: Next
  ): Response | Promise<Response | undefined | void>
}

type Schema = {
  [Method in string]: { type: ValidationTypes; data: unknown }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type ToAppType<T> = T extends Hono<infer _, infer P, infer S, infer T2>
  ? S extends Schema
    ? {
        [K in keyof S]: {
          [K2 in P]: { input: { [K3 in S[K]['type']]: S[K]['data'] }; output: { json: T2 } }
        }
      }
    : { output: { json: T2 } }
  : never

export type ValidationTypes = 'json' | 'form' | 'query' | 'queries'

export type TypeResponse<T = unknown> = {
  response: Response | Promise<Response>
  data: T
  format: 'json'
}
