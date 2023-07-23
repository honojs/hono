import { HonoRequest } from './request.ts'
import { HonoResponder } from './response.ts'
import { FetchEventLike } from './types.ts'
import type { Env, NotFoundHandler, Input } from './types.ts'
import type { CookieOptions } from './utils/cookie.ts'
import { serialize } from './utils/cookie.ts'

type Runtime = 'node' | 'deno' | 'bun' | 'workerd' | 'fastly' | 'edge-light' | 'lagon' | 'other'


export interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void
  passThroughOnException(): void
}
export interface ContextVariableMap {}

interface Get<E extends Env> {
  <Key extends keyof ContextVariableMap>(key: Key): ContextVariableMap[Key]
  <Key extends keyof E['Variables']>(key: Key): E['Variables'][Key]
}

interface Set<E extends Env> {
  <Key extends keyof ContextVariableMap>(key: Key, value: ContextVariableMap[Key]): void
  <Key extends keyof E['Variables']>(key: Key, value: E['Variables'][Key]): void
}


type ContextOptions<E extends Env> = {
  env: E['Bindings']
  executionCtx?: FetchEventLike | ExecutionContext | undefined
  notFoundHandler?: NotFoundHandler<E>
  path?: string
  params?: Record<string, string>
}

export class Context<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  E extends Env = any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  P extends string = any,
  I extends Input = {}
> extends HonoResponder {
  env: E['Bindings'] = {}
  error: Error | undefined = undefined

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _req?: HonoRequest<any, any>
  private _exCtx: FetchEventLike | ExecutionContext | undefined // _executionCtx
  private _map: Record<string, unknown> | undefined
  private _path: string = '/'
  private _params?: Record<string, string> | null
  private rawRequest?: Request | null
  private notFoundHandler: NotFoundHandler<E> = () => new Response()

  constructor(req: Request, options?: ContextOptions<E>) {
    super()
    this.rawRequest = req
    if (options) {
      this._exCtx = options.executionCtx
      this._path = options.path ?? '/'
      this._params = options.params
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
      this._req = new HonoRequest(this.rawRequest!, this._path, this._params!)
      this.rawRequest = undefined
      this._params = undefined
      return this._req
    }
  }

  get event(): FetchEventLike {
    if (this._exCtx instanceof FetchEventLike) {
      return this._exCtx
    } else {
      throw Error('This context has no FetchEvent')
    }
  }

  get executionCtx(): ExecutionContext {
    if (this._exCtx) {
      return this._exCtx as ExecutionContext
    } else {
      throw Error('This context has no ExecutionContext')
    }
  }




  set: Set<E> = (key: string, value: unknown) => {
    this._map ||= {}
    this._map[key as string] = value
  }

  get: Get<E> = (key: string) => {
    return this._map ? this._map[key] : undefined
  }

  /** @deprecated
   * Use Cookie Middleware instead of `c.cookie()`. The `c.cookie()` will be removed in v4.
   *
   * @example
   *
   * import { setCookie } from 'hono/cookie'
   * // ...
   * app.get('/', (c) => {
   *   setCookie(c, 'key', 'value')
   *   //...
   * })
   */
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

    if (global?.fastly !== undefined) {
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
