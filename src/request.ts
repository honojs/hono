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
  /**
   * `.raw` can get the raw Request object.
   * @example
   * ```ts
   * // For Cloudflare Workers
   * app.post('/', async (c) => {
   *   const metadata = c.req.raw.cf?.hostMetadata?
   *   ...
   * })
   * ```
   * @see https://hono.dev/api/request#raw
   */
  raw: Request

  #validatedData: { [K in keyof ValidationTargets]?: {} } // Short name of validatedData
  #matchResult: Result<[unknown, RouterRoute]>
  routeIndex: number = 0
  /**
   * `.path` can get the pathname of the request.
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const pathname = c.req.path // `/about/me`
   * })
   * ```
   * @see https://hono.dev/api/request#path
   */
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

  /**
   * `.req.param()` gets the path parameters.
   * @example
   * ```ts
   * const name = c.req.param('name')
   * // or all parameters at once
   * const { id, comment_id } = c.req.param()
   * ```
   * @see https://hono.dev/api/routing#path-parameter
   */
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

  /**
   * `.query()` can get querystring parameters.
   * @example
   * ```ts
   * // Query params
   * app.get('/search', (c) => {
   *   const query = c.req.query('q')
   * })
   *
   * // Get all params at once
   * app.get('/search', (c) => {
   *   const { q, limit, offset } = c.req.query()
   * })
   * ```
   * @see https://hono.dev/api/request#query
   */
  query(key: string): string | undefined
  query(): Record<string, string>
  query(key?: string) {
    return getQueryParam(this.url, key)
  }

  /**
   * `.queries()` can get multiple querystring parameter values, e.g. /search?tags=A&tags=B
   * @example
   * ```ts
   * app.get('/search', (c) => {
   *   // tags will be string[]
   *   const tags = c.req.queries('tags')
   * })
   * ```
   * @see https://hono.dev/api/request#queries
   */
  queries(key: string): string[] | undefined
  queries(): Record<string, string[]>
  queries(key?: string) {
    return getQueryParams(this.url, key)
  }

  /**
   * `.header()` can get the request header value.
   * @example
   * ```ts
   * app.get('/', (c) => {
   *   const userAgent = c.req.header('User-Agent')
   * })
   * ```
   * @see https://hono.dev/api/request#header
   */
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

  /**
   * `.parseBody()` can parse Request body of type `multipart/form-data` or `application/x-www-form-urlencoded`
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.parseBody()
   * })
   * ```
   * @see https://hono.dev/api/request#parsebody
   */
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

  /**
   * `.json()` can parse Request body of type `application/json`
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.json()
   * })
   * ```
   * @see https://hono.dev/api/request#json
   */
  json<T = any>(): Promise<T> {
    return this.cachedBody('json')
  }

  /**
   * `.text()` can parse Request body of type `text/plain`
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.text()
   * })
   * ```
   * @see https://hono.dev/api/request#text
   */
  text(): Promise<string> {
    return this.cachedBody('text')
  }

  /**
   * `.arrayBuffer()` parse Request body as an `ArrayBuffer`
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.arrayBuffer()
   * })
   * ```
   * @see https://hono.dev/api/request#arraybuffer
   */
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

  /**
   * `.url()` can get the request url strings.
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const url = c.req.url // `http://localhost:8787/about/me`
   *   ...
   * })
   * ```
   * @see https://hono.dev/api/request#url
   */
  get url() {
    return this.raw.url
  }

  /**
   * `.method()` can get the method name of the request.
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const method = c.req.method // `GET`
   * })
   * ```
   * @see https://hono.dev/api/request#method
   */
  get method() {
    return this.raw.method
  }

  /**
   * `.matchedRoutes()` can return a matched route in the handler
   * @example
   * ```ts
   * app.use('*', async function logger(c, next) {
   *   await next()
   *   c.req.matchedRoutes.forEach(({ handler, method, path }, i) => {
   *     const name = handler.name || (handler.length < 2 ? '[handler]' : '[middleware]')
   *     console.log(
   *       method,
   *       ' ',
   *       path,
   *       ' '.repeat(Math.max(10 - path.length, 0)),
   *       name,
   *       i === c.req.routeIndex ? '<- respond from here' : ''
   *     )
   *   })
   * })
   * ```
   * @see https://hono.dev/api/request#matchedroutes
   */
  get matchedRoutes(): RouterRoute[] {
    return this.#matchResult[0].map(([[, route]]) => route)
  }

  /**
   * `routePath()` can retrieve the path registered within the handler
   * @example
   * ```ts
   * app.get('/posts/:id', (c) => {
   *   return c.json({ path: c.req.routePath })
   * })
   * ```
   * @see https://hono.dev/api/request#routepath
   */
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
