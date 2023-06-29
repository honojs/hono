import type { Hono } from '../hono.ts'
import type { ValidationTargets } from '../types.ts'
import type { RemoveBlankRecord } from '../utils/types.ts'

type MethodName = `$${string}`

type Endpoint = Record<MethodName, Data>

type Data = {
  input: Partial<ValidationTargets> & {
    param?: Record<string, string>
  }
  output: {}
}

export type ClientRequestOptions = {
  headers?: Record<string, string>
  fetch?: typeof fetch
}

type ClientRequest<S extends Data> = {
  [M in keyof S]: S[M] extends { input: infer R; output: infer O }
    ? RemoveBlankRecord<R> extends never
      ? (args?: {}, options?: ClientRequestOptions) => Promise<ClientResponse<O>>
      : (args: R, options?: ClientRequestOptions) => Promise<ClientResponse<O>>
    : never
}

export interface ClientResponse<T> {
  ok: boolean
  status: number
  statusText: string
  headers: Headers
  url: string
  redirect(url: string, status: number): Response
  clone(): Response
  json(): Promise<T>
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
  args: any | undefined
) => Promise<ClientResponse<infer O>>
  ? O
  : never

export type InferRequestType<T> = T extends (args: infer R) => Promise<ClientResponse<unknown>>
  ? NonNullable<R>
  : never

type PathToChain<
  Path extends string,
  E extends Endpoint,
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
  ? S extends Record<infer K, Endpoint>
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
