/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-types */
import type { Context } from './context'
import type { Hono } from './hono'

export type Bindings = Record<string, unknown>
export type Variables = Record<string, unknown>

export type Environment = {
  Bindings: Bindings
  Variables: Variables
}

type Env = Partial<Environment>
type I = {}
type O = {}

export type Route = {
  path: string
  method: string
}

export type Handler<E extends Env = Environment, R extends Route = Route, I = {}, O = {}> = (
  c: Context<E, R, I>,
  next: Next
) => Response | Promise<Response | void> | TypeResponse<O> | Promise<TypeResponse<O>>

export interface HandlerInterface<
  E extends Env = Env,
  M extends string = string,
  P extends string = string,
  _I = {},
  _O = {}
> {
  // app.get(handler...)
  <Input = I, Output = O>(
    ...handlers: Handler<E, { method: M; path: string }, Input, Output>[]
  ): Hono<E, { method: M; path: string }, Input, Output>

  (...handlers: Handler<any, any>[]): Hono

  // app.get('/', handler, handler...)
  <Input = I, Output = O, Path extends string = P>(
    path: Path,
    ...handlers: Handler<E, { method: M; path: Path }, Input, Output>[]
  ): Hono<E, { method: M; path: Path }, Input, Output>

  <Input = I, Output = O, Path extends string = P>(
    path: Path,
    ...handlers: Handler<any, any, Input, Output>[]
  ): Hono<E, { method: M; path: Path }, Input, Output>
}

export type ExtractType<T> = T extends TypeResponse<infer R>
  ? R
  : T extends Promise<TypeResponse<infer R>>
  ? R
  : never

type ParamKeyName<NameWithPattern> = NameWithPattern extends `${infer Name}{${infer _Pattern}`
  ? Name
  : NameWithPattern

type ParamKey<Component> = Component extends `:${infer NameWithPattern}`
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

export type ValidationTypes = {
  json: object
  form: Record<string, string | File>
  query: Record<string, string>
  queries: Record<string, string[]>
}

export type ToAppType<T> = T extends Hono<infer _, infer R, infer I, infer O>
  ? ToAppTypeInner<R, I, O>
  : never

type RemoveBlank<T> = {
  [K in keyof T]: T extends { type: ValidationTypes } ? T : never
}

type InputSchema = {
  [K in string]: { type: ValidationTypes; data: unknown }
}

type ToAppTypeInner<R extends Route, I, O> = RemoveBlank<I> extends InputSchema
  ? {
      [K in R['method']]: {
        [K2 in R['path']]: {
          input: UnionToIntersection<
            I extends { type: keyof ValidationTypes; data: unknown }
              ? I extends { type: infer R }
                ? R extends string
                  ? { [K in R]: I['data'] }
                  : never
                : never
              : never
          >
          output: O extends Record<string, never> ? unknown : { json: O } // Currently, support only JSON
        }
      }
    }
  : { output: O extends Record<string, never> ? unknown : { json: O } }

export type InputToData<T> = ExtractData<T> extends never
  ? any
  : UnionToIntersection<ExtractData<T>>
type ExtractData<T> = T extends { type: keyof ValidationTypes }
  ? T extends { type: keyof ValidationTypes; data?: infer R }
    ? R
    : any
  : T

type UnionToIntersection<U> = (U extends unknown ? (k: U) => void : never) extends (
  k: infer I
) => void
  ? I
  : never
