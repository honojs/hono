/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Result } from './router'
import type {
  Input,
  InputToDataByTarget,
  ParamKeys,
  ParamKeyToRecord,
  RemoveQuestion,
  UndefinedIfHavingQuestion,
  ValidationTargets,
  RouterRoute,
} from './types'
import { parseBody } from './utils/body'
import type { BodyData, ParseBodyOptions } from './utils/body'
import type { Cookie } from './utils/cookie'
import { parse } from './utils/cookie'
import type { UnionToIntersection } from './utils/types'
import { getQueryParam, getQueryParams, decodeURIComponent_ } from './utils/url'

type Body = {
  json: any
  text: string
  arrayBuffer: ArrayBuffer
  blob: Blob
  formData: FormData
}
type BodyCache = Partial<Body & { parsedBody: BodyData }>

export class HonoRequest<P extends string = '/', I extends Input['out'] = {}> {
  raw: Request

  #validatedData: { [K in keyof ValidationTargets]?: {} } // Short name of validatedData
  #matchResult: Result<[unknown, RouterRoute]>
  routeIndex: number = 0
  path: string
  bodyCache: BodyCache = {}

  constructor(
    request: Request,
    path: string = '/',
    matchResult: Result<[unknown, RouterRoute]> = [[]]
  ) {
    this.raw = request
    this.path = path
    this.#matchResult = matchResult
    this.#validatedData = {}
  }

  param<P2 extends string = P>(
    key: RemoveQuestion<ParamKeys<P2>>
  ): UndefinedIfHavingQuestion<ParamKeys<P2>>
  param<P2 extends string = P>(): UnionToIntersection<ParamKeyToRecord<ParamKeys<P2>>>
  param(key?: string): unknown {
    if (key) {
      const param = (
        this.#matchResult[1]
          ? this.#matchResult[1][this.#matchResult[0][this.routeIndex][1][key] as any]
          : this.#matchResult[0][this.routeIndex][1][key]
      ) as string | undefined
      return param ? (/\%/.test(param) ? decodeURIComponent_(param) : param) : undefined
    } else {
      const decoded: Record<string, string> = {}

      const keys = Object.keys(this.#matchResult[0][this.routeIndex][1])
      for (let i = 0, len = keys.length; i < len; i++) {
        const key = keys[i]
        const value = (
          this.#matchResult[1]
            ? this.#matchResult[1][this.#matchResult[0][this.routeIndex][1][key] as any]
            : this.#matchResult[0][this.routeIndex][1][key]
        ) as string | undefined
        if (value && typeof value === 'string') {
          decoded[key] = /\%/.test(value) ? decodeURIComponent_(value) : value
        }
      }

      return decoded
    }
  }

  query(key: string): string | undefined
  query(): Record<string, string>
  query(key?: string) {
    return getQueryParam(this.url, key)
  }

  queries(key: string): string[] | undefined
  queries(): Record<string, string[]>
  queries(key?: string) {
    return getQueryParams(this.url, key)
  }

  header(name: string): string | undefined
  header(): Record<string, string>
  header(name?: string) {
    if (name) return this.raw.headers.get(name.toLowerCase()) ?? undefined

    const headerData: Record<string, string | undefined> = {}
    this.raw.headers.forEach((value, key) => {
      headerData[key] = value
    })
    return headerData
  }

  /** @deprecated
   * Use Cookie Middleware instead of `c.req.cookie()`. The `c.req.cookie()` will be removed in v4.
   *
   * @example
   *
   * import { getCookie } from 'hono/cookie'
   * // ...
   * app.get('/', (c) => c.text(getCookie(c, 'cookie-name')))
   */
  cookie(key: string): string | undefined

  /** @deprecated
   * Use Cookie Middleware instead of `c.req.cookie()`. The `c.req.cookie()` will be removed in v4.
   *
   * @example
   *
   * import { getCookie } from 'hono/cookie'
   * // ...
   * app.get('/', (c) => c.json(getCookie(c)))
   */
  cookie(): Cookie

  cookie(key?: string) {
    const cookie = this.raw.headers.get('Cookie')
    if (!cookie) return
    const obj = parse(cookie)
    if (key) {
      const value = obj[key]
      return value
    } else {
      return obj
    }
  }

  async parseBody<T extends BodyData = BodyData>(options?: ParseBodyOptions): Promise<T> {
    if (this.bodyCache.parsedBody) return this.bodyCache.parsedBody as T
    const parsedBody = await parseBody<T>(this, options)
    this.bodyCache.parsedBody = parsedBody
    return parsedBody
  }

  private cachedBody = (key: keyof Body) => {
    const { bodyCache, raw } = this
    const cachedBody = bodyCache[key]
    if (cachedBody) return cachedBody
    /**
     * If an arrayBuffer cache is exist,
     * use it for creating a text, json, and others.
     */
    if (bodyCache.arrayBuffer) {
      return (async () => {
        return await new Response(bodyCache.arrayBuffer)[key]()
      })()
    }
    return (bodyCache[key] = raw[key]())
  }

  json<T = any>(): Promise<T> {
    return this.cachedBody('json')
  }

  text(): Promise<string> {
    return this.cachedBody('text')
  }

  arrayBuffer(): Promise<ArrayBuffer> {
    return this.cachedBody('arrayBuffer')
  }

  blob(): Promise<Blob> {
    return this.cachedBody('blob')
  }

  formData(): Promise<FormData> {
    return this.cachedBody('formData')
  }

  addValidatedData(target: keyof ValidationTargets, data: {}) {
    this.#validatedData[target] = data
  }

  valid<T extends keyof I & keyof ValidationTargets>(target: T): InputToDataByTarget<I, T>
  valid(target: keyof ValidationTargets) {
    return this.#validatedData[target] as unknown
  }

  get url() {
    return this.raw.url
  }

  get method() {
    return this.raw.method
  }

  get matchedRoutes(): RouterRoute[] {
    return this.#matchResult[0].map(([[, route]]) => route)
  }

  get routePath(): string {
    return this.#matchResult[0].map(([[, route]]) => route)[this.routeIndex].path
  }

  /** @deprecated
   * Use `c.req.raw.headers` instead of `c.req.headers`. The `c.req.headers` will be removed in v4.
   * Or you can get the header values with using `c.req.header`.
   * @example
   *
   * app.get('/', (c) => {
   *   const userAgent = c.req.header('User-Agent')
   *   //...
   * })
   */
  get headers() {
    return this.raw.headers
  }

  /** @deprecated
   * Use `c.req.raw.body` instead of `c.req.body`. The `c.req.body` will be removed in v4.
   */
  get body() {
    return this.raw.body
  }

  /** @deprecated
   * Use `c.req.raw.bodyUsed` instead of `c.req.bodyUsed`. The `c.req.bodyUsed` will be removed in v4.
   */
  get bodyUsed() {
    return this.raw.bodyUsed
  }

  /** @deprecated
   * Use `c.req.raw.integrity` instead of `c.req.integrity`. The `c.req.integrity` will be removed in v4.
   */
  get integrity() {
    return this.raw.integrity
  }

  /** @deprecated
   * Use `c.req.raw.keepalive` instead of `c.req.keepalive`. The `c.req.keepalive` will be removed in v4.
   */
  get keepalive() {
    return this.raw.keepalive
  }

  /** @deprecated
   * Use `c.req.raw.referrer` instead of `c.req.referrer`. The `c.req.referrer` will be removed in v4.
   */
  get referrer() {
    return this.raw.referrer
  }

  /** @deprecated
   * Use `c.req.raw.signal` instead of `c.req.signal`. The `c.req.signal` will be removed in v4.
   */
  get signal() {
    return this.raw.signal
  }
}
