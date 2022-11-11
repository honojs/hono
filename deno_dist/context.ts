import type { Environment, NotFoundHandler, ContextVariableMap, Bindings } from './types.ts'
import type { CookieOptions } from './utils/cookie.ts'
import { serialize } from './utils/cookie.ts'
import type { StatusCode } from './utils/http-status.ts'
import type { Schema, SchemaToProp } from './validator/schema.ts'

type HeaderField = [string, string]
type Headers = Record<string, string | string[]>
type Runtime = 'node' | 'deno' | 'bun' | 'cloudflare' | 'fastly' | 'vercel' | 'other'
export type Data = string | ArrayBuffer | ReadableStream

export class Context<
  P extends string = string,
  E extends Partial<Environment> = Environment,
  S extends Partial<Schema> = Schema
> {
  req: Request<P, S extends Schema ? SchemaToProp<S> : S>
  env: E['Bindings']
  finalized: boolean
  error: Error | undefined = undefined

  _status: StatusCode = 200
  private _executionCtx: FetchEvent | ExecutionContext | undefined
  private _pretty: boolean = false
  private _prettySpace: number = 2
  private _map: Record<string, unknown> | undefined
  private _headers: Record<string, string[]> | undefined
  private _res: Response | undefined
  private notFoundHandler: NotFoundHandler<E>

  constructor(
    req: Request<P>,
    env: E['Bindings'] = {},
    executionCtx: FetchEvent | ExecutionContext | undefined = undefined,
    notFoundHandler: NotFoundHandler<E> = () => new Response()
  ) {
    this._executionCtx = executionCtx
    this.req = req as Request<P, S extends Schema ? SchemaToProp<S> : S>
    this.env = env || ({} as Bindings)

    this.notFoundHandler = notFoundHandler
    this.finalized = false
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
      return this._executionCtx
    } else {
      throw Error('This context has no ExecutionContext')
    }
  }

  get res(): Response {
    return (this._res ||= new Response('404 Not Found', { status: 404 }))
  }

  set res(_res: Response) {
    this._res = _res
    this.finalized = true
  }

  header(name: string, value: string, options?: { append?: boolean }): void {
    this._headers ||= {}
    const key = name.toLowerCase()

    let shouldAppend = false
    if (options && options.append) {
      const vAlreadySet = this._headers[key]
      if (vAlreadySet && vAlreadySet.length) {
        shouldAppend = true
      }
    }

    if (shouldAppend) {
      this._headers[key].push(value)
    } else {
      this._headers[key] = [value]
    }

    if (this.finalized) {
      if (shouldAppend) {
        this.res.headers.append(name, value)
      } else {
        this.res.headers.set(name, value)
      }
    }
  }

  status(status: StatusCode): void {
    this._status = status
  }

  set<Key extends keyof ContextVariableMap>(key: Key, value: ContextVariableMap[Key]): void
  set<Key extends keyof E['Variables']>(key: Key, value: E['Variables'][Key]): void
  set(key: string, value: unknown): void
  set(key: string, value: unknown): void {
    this._map ||= {}
    this._map[key] = value
  }

  get<Key extends keyof ContextVariableMap>(key: Key): ContextVariableMap[Key]
  get<Key extends keyof E['Variables']>(key: Key): E['Variables'][Key]
  get<T>(key: string): T
  get(key: string) {
    if (!this._map) {
      return undefined
    }
    return this._map[key]
  }

  pretty(prettyJSON: boolean, space: number = 2): void {
    this._pretty = prettyJSON
    this._prettySpace = space
  }

  newResponse(data: Data | null, status: StatusCode, headers: Headers = {}): Response {
    return new Response(data, {
      status: status || this._status || 200,
      headers: this._finalizeHeaders(headers),
    })
  }

  private _finalizeHeaders(incomingHeaders: Headers): HeaderField[] {
    const finalizedHeaders: HeaderField[] = []
    const headersKv = this._headers || {}
    // If Response is already set
    if (this._res) {
      this._res.headers.forEach((v, k) => {
        headersKv[k] = [v]
      })
    }
    for (const key of Object.keys(incomingHeaders)) {
      const value = incomingHeaders[key]
      if (typeof value === 'string') {
        finalizedHeaders.push([key, value])
      } else {
        for (const v of value) {
          finalizedHeaders.push([key, v])
        }
      }
      delete headersKv[key]
    }
    for (const key of Object.keys(headersKv)) {
      for (const value of headersKv[key]) {
        const kv: HeaderField = [key, value]
        finalizedHeaders.push(kv)
      }
    }
    return finalizedHeaders
  }

  body(data: Data | null, status: StatusCode = this._status, headers: Headers = {}): Response {
    return this.newResponse(data, status, headers)
  }

  text(text: string, status: StatusCode = this._status, headers: Headers = {}): Response {
    headers['content-type'] = 'text/plain; charset=UTF-8'
    return this.body(text, status, headers)
  }

  json<T>(object: T, status: StatusCode = this._status, headers: Headers = {}): Response {
    const body = this._pretty
      ? JSON.stringify(object, null, this._prettySpace)
      : JSON.stringify(object)
    headers['content-type'] = 'application/json; charset=UTF-8'
    return this.body(body, status, headers)
  }

  html(html: string, status: StatusCode = this._status, headers: Headers = {}): Response {
    headers['content-type'] = 'text/html; charset=UTF-8'
    return this.body(html, status, headers)
  }

  redirect(location: string, status: StatusCode = 302): Response {
    return this.newResponse(null, status, {
      Location: location,
    })
  }

  cookie(name: string, value: string, opt?: CookieOptions): void {
    const cookie = serialize(name, value, opt)
    this.header('set-cookie', cookie, { append: true })
  }

  notFound(): Response | Promise<Response> {
    return this.notFoundHandler(this as unknown as Context<string, E>)
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
      return 'cloudflare'
    }

    if (global?.fastly !== undefined) {
      return 'fastly'
    }

    if (typeof global?.EdgeRuntime !== 'string') {
      return 'vercel'
    }

    if (global?.process?.title === 'node') {
      return 'node'
    }

    return 'other'
  }
}
