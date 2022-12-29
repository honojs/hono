/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-types */
import type { Context } from './context'
import type { Hono } from './hono'
import type { UnionToIntersection } from './utils/types'

export type Bindings = Record<string, any> // For Cloudflare Workers
export type Variables = Record<string, any> // For c.set/c.get functions

export type Environment = {
  Bindings: Bindings
  Variables: Variables
}

type Env = Partial<Environment>

export type Route = {
  path: string
  method: string
}

export type Handler<
  E extends Env = Environment,
  R extends Route = Route,
  I = any, // should be any
  O = unknown
> = (
  c: Context<E, R, I>,
  next: Next
) => Response | Promise<Response | undefined | void> | TypeResponse<O> | Promise<TypeResponse<O>>

export interface HandlerInterface<
  E extends Env = Env,
  M extends string = string,
  P extends string = string,
  _I = any,
  _O = unknown
> {
  // app.get(handler...)
  <I2, O2>(...handlers: Handler<E, { method: M; path: string }, I2, O2>[]): Hono<
    E,
    { method: M; path: string },
    I2,
    O2
  >

  (...handlers: Handler<any, any>[]): Hono

  // app.get('/', handler, handler...)
  <I2, O2, Path extends string = P>(
    path: Path,
    ...handlers: Handler<E, { method: M; path: Path }, I2, O2>[]
  ): Hono<E, { method: M; path: Path }, I2, O2>

  <I2, O2, Path extends string>(path: Path, ...handlers: Handler<any, any, I2, O2>[]): Hono<
    E,
    { method: M; path: Path },
    I2,
    O2
  >
}

export type ExtractType<T> = T extends TypeResponse<infer R>
  ? R
  : T extends Promise<TypeResponse<infer R>>
  ? R
  : never

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

export type MiddlewareHandler<E extends Env = Env, R extends Route = Route, S = unknown> = (
  c: Context<E, R, S>,
  next: Next
) => Promise<Response | undefined | void>

// Default of `E ` should be `Environment`, it will be used in `Context`
export type NotFoundHandler<E extends Env = Environment, R extends Route = Route> = (
  c: Context<E, R>
) => Response | Promise<Response>

export type ErrorHandler<E extends Env = Environment> = (err: Error, c: Context<E>) => Response

export type Next = () => Promise<void>

export type TypeResponse<T = unknown> = {
  response: Response | Promise<Response>
  data: T
  format: 'json' // Currently, support only `json` with `c.jsonT()`
}

// This is not used for internally
// Will be used by users as `Handler`
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface CustomHandler<E = Env, R = Route, I = any> {
  (
    c: Context<
      E extends Env ? E : Env,
      E extends Route
        ? E
        : R extends Route
        ? R
        : R extends string
        ? { path: R; method: string }
        : never,
      E extends Env
        ? R extends Route | string
          ? I
          : E extends Env
          ? E
          : never
        : E extends Route | string
        ? R extends Env
          ? E
          : R
        : E
    >,
    next: Next
  ): Response | Promise<Response | undefined | void>
}

export type ValidationTypes = 'json' | 'form' | 'query' | 'queries'

export type ToAppType<T> = T extends Hono<infer _, infer R, infer I, infer O>
  ? ToAppTypeInner<R, I, O>
  : never

type RemoveBlank<T> = {
  [K in keyof T]: T extends { type: ValidationTypes } ? T : never
}

type ToAppTypeInner<R extends Route, I, O> = RemoveBlank<I> extends {
  [K in string]: { type: ValidationTypes; data: unknown }
}
  ? {
      [K in R['method']]: {
        [K2 in R['path']]: {
          input: I extends { type: ValidationTypes; data: unknown }
            ? I extends { type: infer R }
              ? R extends string
                ? { [K in R]: I['data'] }
                : never
              : never
            : never
          output: { json: O } // Currently, support only JSON
        }
      }
    }
  : { output: { json: O } }

export type InputToData<T> = ExtractData<T> extends never
  ? any
  : UnionToIntersection<ExtractData<T>>
type ExtractData<T> = T extends { type: ValidationTypes }
  ? T extends { type: ValidationTypes; data?: infer R }
    ? R
    : any
  : T
