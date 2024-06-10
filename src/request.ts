/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Result } from './router'
import type {
  Input,
  InputToDataByTarget,
  ParamKeyToRecord,
  ParamKeys,
  RemoveQuestion,
  RouterRoute,
  ValidationTargets,
} from './types'
import { parseBody } from './utils/body'
import type { BodyData, ParseBodyOptions } from './utils/body'
import type { Simplify, UnionToIntersection } from './utils/types'
import { decodeURIComponent_, getQueryParam, getQueryParams } from './utils/url'

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
   *
   * @see {@link https://hono.dev/api/request#raw}
   *
   * @example
   * ```ts
   * // For Cloudflare Workers
   * app.post('/', async (c) => {
   *   const metadata = c.req.raw.cf?.hostMetadata?
   *   ...
   * })
   * ```
   */
  raw: Request

  #validatedData: { [K in keyof ValidationTargets]?: {} } // Short name of validatedData
  #matchResult: Result<[unknown, RouterRoute]>
  routeIndex: number = 0
  /**
   * `.path` can get the pathname of the request.
   *
   * @see {@link https://hono.dev/api/request#path}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const pathname = c.req.path // `/about/me`
   * })
   * ```
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
   *
   * @see {@link https://hono.dev/api/routing#path-parameter}
   *
   * @example
   * ```ts
   * const name = c.req.param('name')
   * // or all parameters at once
   * const { id, comment_id } = c.req.param()
   * ```
   */
  param<P2 extends ParamKeys<P> = ParamKeys<P>>(key: P2 extends `${infer _}?` ? never : P2): string
  param<P2 extends RemoveQuestion<ParamKeys<P>> = RemoveQuestion<ParamKeys<P>>>(
    key: P2
  ): string | undefined
  param(key: string): string | undefined
  param<P2 extends string = P>(): Simplify<UnionToIntersection<ParamKeyToRecord<ParamKeys<P2>>>>
  param(key?: string): unknown {
    return key ? this.getDecodedParam(key) : this.getAllDecodedParams()
  }

  private getDecodedParam(key: string): string | undefined {
    const paramKey = this.#matchResult[0][this.routeIndex][1][key]
    const param = this.getParamValue(paramKey)

    return param ? (/\%/.test(param) ? decodeURIComponent_(param) : param) : undefined
  }

  private getAllDecodedParams(): Record<string, string> {
    const decoded: Record<string, string> = {}

    const keys = Object.keys(this.#matchResult[0][this.routeIndex][1])
    for (const key of keys) {
      const value = this.getParamValue(this.#matchResult[0][this.routeIndex][1][key])
      if (value && typeof value === 'string') {
        decoded[key] = /\%/.test(value) ? decodeURIComponent_(value) : value
      }
    }

    return decoded
  }

  private getParamValue(paramKey: any): string | undefined {
    return this.#matchResult[1] ? this.#matchResult[1][paramKey as any] : paramKey
  }

  /**
   * `.query()` can get querystring parameters.
   *
   * @see {@link https://hono.dev/api/request#query}
   *
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
   */
  query(key: string): string | undefined
  query(): Record<string, string>
  query(key?: string) {
    return getQueryParam(this.url, key)
  }

  /**
   * `.queries()` can get multiple querystring parameter values, e.g. /search?tags=A&tags=B
   *
   * @see {@link https://hono.dev/api/request#queries}
   *
   * @example
   * ```ts
   * app.get('/search', (c) => {
   *   // tags will be string[]
   *   const tags = c.req.queries('tags')
   * })
   * ```
   */
  queries(key: string): string[] | undefined
  queries(): Record<string, string[]>
  queries(key?: string) {
    return getQueryParams(this.url, key)
  }

  /**
   * `.header()` can get the request header value.
   *
   * @see {@link https://hono.dev/api/request#header}
   *
   * @example
   * ```ts
   * app.get('/', (c) => {
   *   const userAgent = c.req.header('User-Agent')
   * })
   * ```
   */
  header(name: string): string | undefined
  header(): Record<string, string>
  header(name?: string) {
    if (name) {
      return this.raw.headers.get(name.toLowerCase()) ?? undefined
    }

    const headerData: Record<string, string | undefined> = {}
    this.raw.headers.forEach((value, key) => {
      headerData[key] = value
    })
    return headerData
  }

  /**
   * `.parseBody()` can parse Request body of type `multipart/form-data` or `application/x-www-form-urlencoded`
   *
   * @see {@link https://hono.dev/api/request#parsebody}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.parseBody()
   * })
   * ```
   */
  async parseBody<Options extends Partial<ParseBodyOptions>, T extends BodyData<Options>>(
    options?: Options
  ): Promise<T>
  async parseBody<T extends BodyData>(options?: Partial<ParseBodyOptions>): Promise<T>
  async parseBody(options?: Partial<ParseBodyOptions>) {
    return (this.bodyCache.parsedBody ??= await parseBody(this, options))
  }

  private cachedBody = (key: keyof Body) => {
    const { bodyCache, raw } = this
    const cachedBody = bodyCache[key]

    if (cachedBody) {
      return cachedBody
    }

    const anyCachedKey = Object.keys(bodyCache)[0]
    if (anyCachedKey) {
      return (bodyCache[anyCachedKey as keyof Body] as Promise<BodyInit>).then((body) => {
        if (anyCachedKey === 'json') {
          body = JSON.stringify(body)
        }
        return new Response(body)[key]()
      })
    }

    return (bodyCache[key] = raw[key]())
  }

  /**
   * `.json()` can parse Request body of type `application/json`
   *
   * @see {@link https://hono.dev/api/request#json}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.json()
   * })
   * ```
   */
  json<T = any>(): Promise<T> {
    return this.cachedBody('json')
  }

  /**
   * `.text()` can parse Request body of type `text/plain`
   *
   * @see {@link https://hono.dev/api/request#text}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.text()
   * })
   * ```
   */
  text(): Promise<string> {
    return this.cachedBody('text')
  }

  /**
   * `.arrayBuffer()` parse Request body as an `ArrayBuffer`
   *
   * @see {@link https://hono.dev/api/request#arraybuffer}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.arrayBuffer()
   * })
   * ```
   */
  arrayBuffer(): Promise<ArrayBuffer> {
    return this.cachedBody('arrayBuffer')
  }

  /**
   * Parses the request body as a `Blob`.
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.blob();
   * });
   * ```
   * @see https://hono.dev/api/request#blob
   */
  blob(): Promise<Blob> {
    return this.cachedBody('blob')
  }

  /**
   * Parses the request body as `FormData`.
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.formData();
   * });
   * ```
   * @see https://hono.dev/api/request#formdata
   */
  formData(): Promise<FormData> {
    return this.cachedBody('formData')
  }

  /**
   * Adds validated data to the request.
   *
   * @param target - The target of the validation.
   * @param data - The validated data to add.
   */
  addValidatedData(target: keyof ValidationTargets, data: {}) {
    this.#validatedData[target] = data
  }

  /**
   * Gets validated data from the request.
   *
   * @param target - The target of the validation.
   * @returns The validated data.
   *
   * @see https://hono.dev/api/request#valid
   */
  valid<T extends keyof I & keyof ValidationTargets>(target: T): InputToDataByTarget<I, T>
  valid(target: keyof ValidationTargets) {
    return this.#validatedData[target] as unknown
  }

  /**
   * `.url()` can get the request url strings.
   *
   * @see {@link https://hono.dev/api/request#url}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const url = c.req.url // `http://localhost:8787/about/me`
   *   ...
   * })
   * ```
   */
  get url(): string {
    return this.raw.url
  }

  /**
   * `.method()` can get the method name of the request.
   *
   * @see {@link https://hono.dev/api/request#method}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const method = c.req.method // `GET`
   * })
   * ```
   */
  get method(): string {
    return this.raw.method
  }

  /**
   * `.matchedRoutes()` can return a matched route in the handler
   *
   * @see {@link https://hono.dev/api/request#matchedroutes}
   *
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
   */
  get matchedRoutes(): RouterRoute[] {
    return this.#matchResult[0].map(([[, route]]) => route)
  }

  /**
   * `routePath()` can retrieve the path registered within the handler
   *
   * @see {@link https://hono.dev/api/request#routepath}
   *
   * @example
   * ```ts
   * app.get('/posts/:id', (c) => {
   *   return c.json({ path: c.req.routePath })
   * })
   * ```
   */
  get routePath(): string {
    return this.#matchResult[0].map(([[, route]]) => route)[this.routeIndex].path
  }
}
