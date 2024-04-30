import type { UpgradedWebSocketResponseInputJSONType } from '../helper/websocket'
import type { Hono } from '../hono'
import type { Endpoint, Schema } from '../types'
import type { StatusCode, SuccessStatusCode } from '../utils/http-status'
import type { HasRequiredKeys } from '../utils/types'

type HonoRequest = (typeof Hono.prototype)['request']

export type ClientRequestOptions<T = unknown> = keyof T extends never
  ? {
      headers?:
        | Record<string, string>
        | (() => Record<string, string> | Promise<Record<string, string>>)
      fetch?: typeof fetch | HonoRequest
    }
  : {
      headers: T | (() => T | Promise<T>)
      fetch?: typeof fetch | HonoRequest
    }

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
        ? { param: P }
        : {}
      : {}
  ) => URL
} & (S['$get'] extends { input: { json: UpgradedWebSocketResponseInputJSONType } }
    ? S['$get'] extends { input: infer I }
      ? {
          $ws: (args?: Omit<I, 'json'>) => WebSocket
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
  status: infer S
}
  ? ClientResponse<O, S>
  : never

export interface ClientResponse<T, U = StatusCode> {
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
  json(): Promise<BlankRecordToNever<T>>
  text(): Promise<string>
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
  ? U extends ClientResponse<infer O, infer S>
    ? { input: NonNullable<R>; output: O; status: S } extends Endpoint
      ? { input: NonNullable<R>; output: O; status: S }
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
  Original extends string = ''
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
export type Client<T> = T extends Hono<any, infer S, any>
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
