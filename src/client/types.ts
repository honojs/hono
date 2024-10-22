import type { Hono } from '../hono'
import type { HonoBase } from '../hono-base'
import type { Endpoint, ResponseFormat, Schema } from '../types'
import type { StatusCode, SuccessStatusCode } from '../utils/http-status'
import type { HasRequiredKeys } from '../utils/types'

type HonoRequest = (typeof Hono.prototype)['request']

export type ClientRequestOptions<T = unknown> = {
  fetch?: typeof fetch | HonoRequest
  webSocket?: (...args: ConstructorParameters<typeof WebSocket>) => WebSocket
  /**
   * Standard `RequestInit`, caution that this take highest priority
   * and could be used to overwrite things that Hono sets for you, like `body | method | headers`.
   *
   * If you want to add some headers, use in `headers` instead of `init`
   */
  init?: RequestInit
} & (keyof T extends never
  ? {
      headers?:
        | Record<string, string>
        | (() => Record<string, string> | Promise<Record<string, string>>)
    }
  : {
      headers: T | (() => T | Promise<T>)
    })

export type ClientRequest<S extends Schema> = {
  [M in keyof S]: S[M] extends Endpoint & { input: infer R }
    ? R extends object
      ? HasRequiredKeys<R> extends true
        ? (args: R, options?: ClientRequestOptions) => Promise<ClientResponseOfEndpoint<S[M]>>
        : (args?: R, options?: ClientRequestOptions) => Promise<ClientResponseOfEndpoint<S[M]>>
      : never
    : never
} & {
  $url: (
    arg?: S[keyof S] extends { input: infer R }
      ? R extends { param: infer P }
        ? R extends { query: infer Q }
          ? { param: P; query: Q }
          : { param: P }
        : R extends { query: infer Q }
        ? { query: Q }
        : {}
      : {}
  ) => URL
} & (S['$get'] extends { outputFormat: 'ws' }
    ? S['$get'] extends { input: infer I }
      ? {
          $ws: (args?: I) => WebSocket
        }
      : {}
    : {})

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BlankRecordToNever<T> = T extends any
  ? T extends null
    ? null
    : keyof T extends never
    ? never
    : T
  : never

type ClientResponseOfEndpoint<T extends Endpoint = Endpoint> = T extends {
  output: infer O
  outputFormat: infer F
  status: infer S
}
  ? ClientResponse<O, S extends number ? S : never, F extends ResponseFormat ? F : never>
  : never

export interface ClientResponse<
  T,
  U extends number = StatusCode,
  F extends ResponseFormat = ResponseFormat
> extends globalThis.Response {
  readonly body: ReadableStream | null
  readonly bodyUsed: boolean
  ok: U extends SuccessStatusCode
    ? true
    : U extends Exclude<StatusCode, SuccessStatusCode>
    ? false
    : boolean
  status: U
  statusText: string
  headers: Headers
  url: string
  redirect(url: string, status: number): Response
  clone(): Response
  json(): F extends 'text'
    ? Promise<never>
    : F extends 'json'
    ? Promise<BlankRecordToNever<T>>
    : Promise<unknown>
  text(): F extends 'text' ? (T extends string ? Promise<T> : Promise<never>) : Promise<string>
  blob(): Promise<Blob>
  formData(): Promise<FormData>
  arrayBuffer(): Promise<ArrayBuffer>
}

export interface Response extends ClientResponse<unknown> {}

export type Fetch<T> = (
  args?: InferRequestType<T>,
  opt?: ClientRequestOptions
) => Promise<ClientResponseOfEndpoint<InferEndpointType<T>>>

type InferEndpointType<T> = T extends (
  args: infer R,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  options: any | undefined
) => Promise<infer U>
  ? U extends ClientResponse<infer O, infer S, infer F>
    ? { input: NonNullable<R>; output: O; outputFormat: F; status: S } extends Endpoint
      ? { input: NonNullable<R>; output: O; outputFormat: F; status: S }
      : never
    : never
  : never

export type InferResponseType<T, U extends StatusCode = StatusCode> = InferResponseTypeFromEndpoint<
  InferEndpointType<T>,
  U
>

type InferResponseTypeFromEndpoint<T extends Endpoint, U extends StatusCode> = T extends {
  output: infer O
  status: infer S
}
  ? S extends U
    ? O
    : never
  : never

export type InferRequestType<T> = T extends (
  args: infer R,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  options: any | undefined
) => Promise<ClientResponse<unknown>>
  ? NonNullable<R>
  : never

export type InferRequestOptionsType<T> = T extends (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: any,
  options: infer R
) => Promise<ClientResponse<unknown>>
  ? NonNullable<R>
  : never

type PathToChain<
  Path extends string,
  E extends Schema,
  Original extends string = Path
> = Path extends `/${infer P}`
  ? PathToChain<P, E, Path>
  : Path extends `${infer P}/${infer R}`
  ? { [K in P]: PathToChain<R, E, Original> }
  : {
      [K in Path extends '' ? 'index' : Path]: ClientRequest<
        E extends Record<string, unknown> ? E[Original] : never
      >
    }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Client<T> = T extends HonoBase<any, infer S, any>
  ? S extends Record<infer K, Schema>
    ? K extends string
      ? PathToChain<K, S>
      : never
    : never
  : never

export type Callback = (opts: CallbackOptions) => unknown

interface CallbackOptions {
  path: string[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: any[]
}

export type ObjectType<T = unknown> = {
  [key: string]: T
}
