/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-types */
import type { Context } from './context.ts'
import type { Hono } from './hono.ts'
import type { UnionToIntersection } from './utils/types.ts'

export type Bindings = Record<string, unknown>
export type Variables = Record<string, unknown>

export type Env = {
  Bindings?: Bindings
  Variables?: Variables
}

export type Route = {
  path: string
  method: string
}

export type Handler<E extends Env = any, P extends string = any, I = {}, O = {}> = (
  c: Context<E, P, I>,
  next: Next
) => Response | Promise<Response | void | TypeResponse<O>> | TypeResponse<O>

export interface HandlerInterface<
  E extends Env = Env,
  M extends string = any,
  P extends string = any
> {
  <Input = {}, Output = {}>(
    ...handlers: (Handler<E, P, Input, Output> | MiddlewareHandler<E, P, Input>)[]
  ): Hono<E, { method: M; path: P }, Input, Output>

  <Path extends string, Input = {}, Output = {}>(
    path: Path,
    ...handlers: (Handler<E, Path, Input, Output> | MiddlewareHandler<E, Path, Input>)[]
  ): Hono<E, { method: M; path: Path }, Input, Output>
}

export type ExtractType<T> = T extends TypeResponse<infer R>
  ? R
  : T extends Promise<TypeResponse<infer R>>
  ? R
  : never

export type MiddlewareHandler<E extends Env = any, P extends string = any, I = {}> = (
  c: Context<E, P, I>,
  next: Next
) => Promise<Response | undefined | void>

export type NotFoundHandler<E extends Env = any> = (c: Context<E>) => Response | Promise<Response>

export type ErrorHandler<E extends Env = any> = (err: Error, c: Context<E>) => Response

export type Next = () => Promise<void>

export type TypeResponse<T = unknown> = {
  response: Response | Promise<Response>
  data: T
  format: 'json' // Currently, support only `json` with `c.jsonT()`
}

// This is not used for internally
// Will be used by users as `Handler`
export interface CustomHandler<E = Env, P = any, I = any> {
  (
    c: Context<
      E extends Env ? E : Env,
      E extends string ? E : P extends string ? P : never,
      E extends Env
        ? P extends string
          ? I
          : E extends Env
          ? E
          : never
        : E extends Route | string
        ? P extends Env
          ? E
          : P
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
