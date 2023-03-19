import { HonoRequest } from './request.ts'
import type { TypedResponse } from './types.ts'
import type { Env, NotFoundHandler, Input } from './types.ts'
import type { CookieOptions } from './utils/cookie.ts'
import { serialize } from './utils/cookie.ts'
import type { StatusCode } from './utils/http-status.ts'
import type { JSONValue } from './utils/types.ts'

type Runtime = 'node' | 'deno' | 'bun' | 'workerd' | 'fastly' | 'edge-light' | 'lagon' | 'other'
type HeaderRecord = Record<string, string | string[]>
type Data = string | ArrayBuffer | ReadableStream

export interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void
  passThroughOnException(): void
}
export interface ContextVariableMap {}

interface NewResponse {
  (data: Data | null, status?: StatusCode, headers?: HeaderRecord): Response
  (data: Data | null, init?: ResponseInit): Response
}

interface BodyRespond extends NewResponse {}

interface TextRespond {
  (text: string, status?: StatusCode, headers?: HeaderRecord): Response
  (text: string, init?: ResponseInit): Response
}

interface JSONRespond {
  <T = JSONValue>(object: T, status?: StatusCode, headers?: HeaderRecord): Response
  <T = JSONValue>(object: T, init?: ResponseInit): Response
}

interface JSONTRespond {
  <T>(
    object: T extends JSONValue ? T : JSONValue,
    status?: StatusCode,
    headers?: HeaderRecord
  ): TypedResponse<T extends JSONValue ? (JSONValue extends T ? never : T) : never>
  <T>(object: T extends JSONValue ? T : JSONValue, init?: ResponseInit): TypedResponse<
    T extends JSONValue ? (JSONValue extends T ? never : T) : never
  >
}

interface HTMLRespond {
  (html: string, status?: StatusCode, headers?: HeaderRecord): Response
  (html: string, init?: ResponseInit): Response
}

type GetVariable<K, E extends Env> = K extends keyof E['Variables']
  ? E['Variables'][K]
  : K extends keyof ContextVariableMap
  ? ContextVariableMap[K]
  : unknown

type ContextOptions<E extends Env> = {
  env: E['Bindings']
  executionCtx?: FetchEvent | ExecutionContext | undefined
  notFoundHandler?: NotFoundHandler<E>
  path?: string
  paramData?: Record<string, string>
}

export class Context<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  E extends Env = any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  P extends string = any,
  I extends Input = {}
> {
  env: E['Bindings'] = {}
  finalized: boolean = false
  error: Error | undefined = undefined

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _req?: HonoRequest<any, any>
  private _status: StatusCode = 200
  private _executionCtx: FetchEvent | ExecutionContext | undefined
  private _pretty: boolean = false
  private _prettySpace: number = 2
  private _map: Record<string, unknown> | undefined
  private _headers: Headers | undefined = undefined
  private _preparedHeaders: Record<string, string> | undefined = undefined
  private _res: Response | undefined
  private _path: string = '/'
  private _paramData?: Record<string, string> | null
  private rawRequest?: Request | null
  private notFoundHandler: NotFoundHandler<E> = () => new Response()

  constructor(req: Request, options?: ContextOptions<E>) {
    this.rawRequest = req
    if (options) {
      this._executionCtx = options.executionCtx
      this._path = options.path ?? '/'
      this._paramData = options.paramData
      this.env = options.env
      if (options.notFoundHandler) {
        this.notFoundHandler = options.notFoundHandler
      }
    }
  }

  get req(): HonoRequest<P, I['out']> {
    if (this._req) {
      return this._req
    } else {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      this._req = new HonoRequest(this.rawRequest!, this._path, this._paramData!)
      this.rawRequest = undefined
      this._paramData = undefined
      return this._req
    }
  }

  get event(): FetchEvent {
    if (this._executionCtx instanceof FetchEvent) {
      return this._executionCtx
    } else {
      throw Error('This context has no FetchEvent')
    }
  }

  get executionCtx(): ExecutionContext {
    if (this._executionCtx) {
      return this._executionCtx as ExecutionContext
    } else {
      throw Error('This context has no ExecutionContext')
    }
  }

  get res(): Response {
    return (this._res ||= new Response('404 Not Found', { status: 404 }))
  }

  set res(_res: Response | undefined) {
    if (this._res && _res) {
      this._res.headers.delete('content-type')
      this._res.headers.forEach((v, k) => {
        _res.headers.set(k, v)
      })
    }
    this._res = _res
    this.finalized = true
  }

  header = (name: string, value: string, options?: { append?: boolean }): void => {
    if (options?.append) {
      if (!this._headers) {
        this._headers = new Headers(this._preparedHeaders)
        this._preparedHeaders = {}
      }
      this._headers.append(name, value)
    } else {
      if (this._headers) {
        this._headers.set(name, value)
      } else {
        this._preparedHeaders ??= {}
        this._preparedHeaders[name.toLowerCase()] = value
      }
    }

    if (this.finalized) {
      if (options?.append) {
        this.res.headers.append(name, value)
      } else {
        this.res.headers.set(name, value)
      }
    }
  }

  status = (status: StatusCode): void => {
    this._status = status
  }

  set = <Key extends keyof E['Variables'] | keyof ContextVariableMap>(
    key: Key,
    value: GetVariable<Key, E>
  ): void => {
    this._map ||= {}
    this._map[key as string] = value
  }

  get = <Key extends keyof E['Variables'] | keyof ContextVariableMap>(
    key: Key
  ): GetVariable<Key, E> => {
    return this._map?.[key as string] as GetVariable<Key, E>
  }

  pretty = (prettyJSON: boolean, space: number = 2): void => {
    this._pretty = prettyJSON
    this._prettySpace = space
  }

  newResponse: NewResponse = (
    data: Data | null,
    arg?: StatusCode | ResponseInit,
    headers?: HeaderRecord
  ): Response => {
    // Optimized
    if (!headers && !this._headers && !this._res && !arg && this._status === 200) {
      return new Response(data, {
        headers: this._preparedHeaders,
      })
    }

    // Return Response immediately if arg is RequestInit.
    if (arg && typeof arg !== 'number') {
      const res = new Response(data, arg)
      const contentType = this._preparedHeaders?.['content-type']
      if (contentType) {
        res.headers.set('content-type', contentType)
      }
      return res
    }

    const status = arg ?? this._status
    this._preparedHeaders ??= {}

    this._headers ??= new Headers()
    for (const [k, v] of Object.entries(this._preparedHeaders)) {
      this._headers.set(k, v)
    }

    if (this._res) {
      this._res.headers.forEach((v, k) => {
        this._headers?.set(k, v)
      })
      for (const [k, v] of Object.entries(this._preparedHeaders)) {
        this._headers.set(k, v)
      }
    }

    headers ??= {}
    for (const [k, v] of Object.entries(headers)) {
      if (typeof v === 'string') {
        this._headers.set(k, v)
      } else {
        this._headers.delete(k)
        for (const v2 of v) {
          this._headers.append(k, v2)
        }
      }
    }

    return new Response(data, {
      status,
      headers: this._headers,
    })
  }

  body: BodyRespond = (
    data: Data | null,
    arg?: StatusCode | RequestInit,
    headers?: HeaderRecord
  ): Response => {
    return typeof arg === 'number'
      ? this.newResponse(data, arg, headers)
      : this.newResponse(data, arg)
  }

  text: TextRespond = (
    text: string,
    arg?: StatusCode | RequestInit,
    headers?: HeaderRecord
  ): Response => {
    // If the header is empty, return Response immediately.
    // Content-Type will be added automatically as `text/plain`.
    if (!this._preparedHeaders) {
      if (!headers && !this._res && !this._headers && !arg) {
        return new Response(text)
      }
      this._preparedHeaders = {}
    }
    // If Content-Type is not set, we don't have to set `text/plain`.
    // Fewer the header values, it will be faster.
    if (this._preparedHeaders['content-type']) {
      this._preparedHeaders['content-type'] = 'text/plain; charset=UTF8'
    }
    return typeof arg === 'number'
      ? this.newResponse(text, arg, headers)
      : this.newResponse(text, arg)
  }

  json: JSONRespond = <T = {}>(
    object: T,
    arg?: StatusCode | RequestInit,
    headers?: HeaderRecord
  ) => {
    const body = this._pretty
      ? JSON.stringify(object, null, this._prettySpace)
      : JSON.stringify(object)
    this._preparedHeaders ??= {}
    this._preparedHeaders['content-type'] = 'application/json; charset=UTF-8'
    return typeof arg === 'number'
      ? this.newResponse(body, arg, headers)
      : this.newResponse(body, arg)
  }

  jsonT: JSONTRespond = <T>(
    object: T extends JSONValue ? T : JSONValue,
    arg?: StatusCode | RequestInit,
    headers?: HeaderRecord
  ): TypedResponse<T extends JSONValue ? (JSONValue extends T ? never : T) : never> => {
    return {
      response: typeof arg === 'number' ? this.json(object, arg, headers) : this.json(object, arg),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: object as any,
      format: 'json',
    }
  }

  html: HTMLRespond = (
    html: string,
    arg?: StatusCode | RequestInit,
    headers?: HeaderRecord
  ): Response => {
    this._preparedHeaders ??= {}
    this._preparedHeaders['content-type'] = 'text/html; charset=UTF-8'
    return typeof arg === 'number'
      ? this.newResponse(html, arg, headers)
      : this.newResponse(html, arg)
  }

  redirect = (location: string, status: StatusCode = 302): Response => {
    this._headers ??= new Headers()
    this._headers.set('Location', location)
    return this.newResponse(null, status)
  }

  cookie = (name: string, value: string, opt?: CookieOptions): void => {
    const cookie = serialize(name, value, opt)
    this.header('set-cookie', cookie, { append: true })
  }

  notFound = (): Response | Promise<Response> => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return this.notFoundHandler(this)
  }

  get runtime(): Runtime {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const global = globalThis as any

    if (global?.Deno !== undefined) {
      return 'deno'
    }

    if (global?.Bun !== undefined) {
      return 'bun'
    }

    if (typeof global?.WebSocketPair === 'function') {
      return 'workerd'
    }

    if (typeof global?.EdgeRuntime === 'string') {
      return 'edge-light'
    }

    let onFastly = false
    try {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const { env } = require('fastly:env')
      if (env instanceof Function) onFastly = true
    } catch {}
    if (onFastly) {
      return 'fastly'
    }

    if (global?.__lagon__ !== undefined) {
      return 'lagon'
    }

    if (global?.process?.release?.name === 'node') {
      return 'node'
    }

    return 'other'
  }
}
