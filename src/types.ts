import type { Context } from './context'
import type { Hono } from './hono'
import type { UnionToIntersection } from './utils/types'

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
  E extends Env = Env,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _M extends string = string,
  P extends string = string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  S = any, // should be any
  T = unknown
> = (
  c: Context<E, P, S>,
  next: Next
) => Response | Promise<Response | undefined | void> | TypeResponse<T> | Promise<TypeResponse<T>>

export interface HandlerInterface<
  E extends Env = Env,
  M extends string = string,
  P extends string = string,
  S = unknown,
  T = unknown,
  U = Hono<E, P, S, T>
> {
  // app.get(handler...)
  <
    Env extends Partial<Environment> = E,
    Path extends string = P,
    Schema = S,
    Type = T
  >(
    ...handlers: Handler<Env, M, GetParamKeys<Path>, Schema, Type>[]
  ): Hono<Env, Path, Schema>
  (...handlers: Handler<E, M, P, S, T>[]): U

  // app.get('/', handler, handler...)
  <
    Env extends Partial<Environment> = E,
    Path extends string = P,
    Schema = S,
    Type = T
  >(
    path: Path,
    ...handlers: Handler<Env, M, GetParamKeys<Path>, Schema, Type>[]
  ): Hono<Env, Path, Schema, ExtractType<ReturnType<typeof handlers[-1]>, Type>>
  (path: string, ...handlers: Handler<E, M, P, S, T>[]): U
}

export type ExtractType<T, U> = T extends TypeResponse<infer R>
  ? R
  : T extends Promise<TypeResponse<infer R>>
  ? R
  : U

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type ParamKeyName<NameWithPattern> = NameWithPattern extends `${infer Name}{${infer _Pattern}`
  ? Name
  : NameWithPattern

type ParamKey<Component> = Component extends `:${infer NameWithPattern}?`
  ? ParamKeyName<NameWithPattern>
  : Component extends `:${infer NameWithPattern}`
  ? ParamKeyName<NameWithPattern>
  : never

type ParamKeys<Path> = Path extends `${infer Component}/${infer Rest}`
  ? ParamKey<Component> | ParamKeys<Rest>
  : ParamKey<Path>

export type GetParamKeys<Path> = ParamKeys<Path> extends never ? Path : ParamKeys<Path>

export type MiddlewareHandler<
  E extends Env = Env,
  P extends string = string,
  S = unknown
> = (c: Context<E, P, S>, next: Next) => Promise<Response | undefined | void>

export type NotFoundHandler<E extends Env = Env> = (
  c: Context<E>
) => Response | Promise<Response>

export type ErrorHandler<E extends Env = Env> = (
  err: Error,
  c: Context<E>
) => Response

export type Next = () => Promise<void>

export type TypeResponse<T = unknown> = {
  response: Response | Promise<Response>
  data: T
  format: 'json' // Currently, support only `json` with `c.jsonT()`
}

// This is not used for internally
// Will be used by users as `Handler`
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface CustomHandler<E = Env, P = string, S = any> {
  (
    c: Context<
      E extends Env ? E : Env,
      E extends string ? E : P extends string ? P : never,
      E extends Env
        ? P extends string
          ? S
          : E extends Partial<Environment>
          ? E
          : never
        : E extends string
        ? P extends Partial<Environment>
          ? E
          : P
        : E
    >,
    next: Next
  ): Response | Promise<Response | undefined | void>
}

export type ValidationTypes = 'json' | 'form' | 'query' | 'queries'

type Schema = {
  [Method in string]: { type: ValidationTypes; data: unknown }
}

type RemoveBlank<T> = T extends { [K in string]: infer R }
  ? R extends { type: ValidationTypes }
    ? R
    : never
  : never

export type RemoveBlankFromValue<T> = { [K in keyof T]: RemoveBlank<T> }

type InputToValue<T> = T extends { type?: infer V extends string; data?: infer R } 
  ? { [K in V]: UnionToIntersection<R> }
  : T

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type ToAppType<T> = T extends Hono<infer _, infer P, infer S, infer T2>
  ? ToAppTypeInner<P, S, T2>
  : never

type ToAppTypeInner<Path extends string, T, U> = RemoveBlankFromValue<T> extends Schema
  ? {
      [K in keyof RemoveBlankFromValue<T>]: {
        [K2 in Path]: RemoveBlankFromValue<T>[K]['type'] extends ValidationTypes
          ? {
              input: InputToValue<RemoveBlankFromValue<T>[K]>
              output: { json: U }
            }
          : never
      }
    }
  : { output: { json: U } }

  export type InputToData<T> = T extends { [K in string]: { type?: ValidationTypes; data?: infer R } }
  ? UnionToIntersection<R>
  : T