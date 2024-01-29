import type { Hono } from '../hono'
import type { Schema } from '../types'
import type { HasRequiredKeys } from '../utils/types'

type HonoRequest = (typeof Hono.prototype)['request']

export type ClientRequestOptions<T = unknown> = keyof T extends never
  ? {
      headers?: Record<string, string>
      fetch?: typeof fetch | HonoRequest
    }
  : {
      headers: T
      fetch?: typeof fetch | HonoRequest
    }

export type ClientRequest<S extends Schema> = {
  [M in keyof S]: S[M] extends { input: infer R; output: infer O }
    ? R extends object
      ? HasRequiredKeys<R> extends true
        ? (args: R, options?: ClientRequestOptions) => Promise<ClientResponse<O>>
        : (args?: R, options?: ClientRequestOptions) => Promise<ClientResponse<O>>
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
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BlankRecordToNever<T> = T extends any ? (keyof T extends never ? never : T) : never

export interface ClientResponse<T> {
  readonly body: ReadableStream | null
  readonly bodyUsed: boolean
  ok: boolean
  status: number
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
) => Promise<ClientResponse<InferResponseType<T>>>

export type InferResponseType<T> = T extends (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: any | undefined,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  options: any | undefined
) => Promise<ClientResponse<infer O>>
  ? O
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
