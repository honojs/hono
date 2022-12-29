import type { GetParamKeys, InputToData, Route } from './types.ts'
import { parseBody } from './utils/body.ts'
import type { BodyData } from './utils/body.ts'
import type { Cookie } from './utils/cookie.ts'
import { parse } from './utils/cookie.ts'
import { getQueryStringFromURL } from './utils/url.ts'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class HonoRequest<R extends Route = Route, I = any> {
  raw: Request

  private paramData: Record<string, string> | undefined
  private headerData: Record<string, string> | undefined
  private queryData: Record<string, string> | undefined
  private bodyData: BodyData | undefined
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private jsonData: Promise<any> | undefined
  private data: InputToData<I>

  constructor(request: Request, paramData?: Record<string, string> | undefined) {
    this.raw = request
    this.paramData = paramData
    this.data = {} as InputToData<I>
  }

  param(key: GetParamKeys<R['path']>): string
  param(): Record<GetParamKeys<R['path']>, string>
  param(key?: string) {
    if (this.paramData) {
      if (key) {
        const param = this.paramData[key]
        return param ? decodeURIComponent(param) : undefined
      } else {
        const decoded: Record<string, string> = {}

        for (const [key, value] of Object.entries(this.paramData)) {
          if (value && typeof value === 'string') {
            decoded[key] = decodeURIComponent(value)
          }
        }

        return decoded
      }
    }
    return null
  }

  query(key: string): string
  query(): Record<string, string>
  query(key?: string) {
    const queryString = getQueryStringFromURL(this.url)
    const searchParams = new URLSearchParams(queryString)
    if (!this.queryData) {
      this.queryData = {}
      for (const key of searchParams.keys()) {
        this.queryData[key] = searchParams.get(key) || ''
      }
    }
    if (key) {
      return this.queryData[key]
    } else {
      return this.queryData
    }
  }

  queries(key: string): string[]
  queries(): Record<string, string[]>
  queries(key?: string) {
    const queryString = getQueryStringFromURL(this.url)
    const searchParams = new URLSearchParams(queryString)
    if (key) {
      return searchParams.getAll(key)
    } else {
      const result: Record<string, string[]> = {}
      for (const key of searchParams.keys()) {
        result[key] = searchParams.getAll(key)
      }
      return result
    }
  }

  header(name: string): string
  header(): Record<string, string>
  header(name?: string) {
    if (!this.headerData) {
      this.headerData = {}
      this.raw.headers.forEach((value, key) => {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        this.headerData![key] = value
      })
    }
    if (name) {
      return this.headerData[name.toLowerCase()]
    } else {
      return this.headerData
    }
  }

  cookie(key: string): string | undefined
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

  async parseBody<BodyType extends BodyData>(): Promise<BodyType> {
    // Cache the parsed body
    let body: BodyType
    if (!this.bodyData) {
      body = await parseBody<BodyType>(this.raw)
      this.bodyData = body
    } else {
      body = this.bodyData as BodyType
    }
    return body
  }

  async json<JSONData = unknown>() {
    // Cache the JSON body
    let jsonData: Promise<Partial<JSONData>>
    if (!this.jsonData) {
      jsonData = this.raw.json()
      this.jsonData = jsonData
    } else {
      jsonData = this.jsonData
    }
    return jsonData
  }

  async text() {
    return this.raw.text()
  }

  async arrayBuffer() {
    return this.raw.arrayBuffer()
  }

  async blob() {
    return this.raw.blob()
  }

  async formData() {
    return this.raw.formData()
  }

  valid(data?: unknown): InputToData<I> {
    if (!this.data) {
      this.data = {} as InputToData<I>
    }
    if (data) {
      this.data = data as InputToData<I>
    }
    return this.data
  }

  get url() {
    return this.raw.url
  }
  get method() {
    return this.raw.method
  }
  get headers() {
    return this.raw.headers
  }
  get redirect() {
    return this.raw.redirect
  }
  get body() {
    return this.raw.body
  }
  get bodyUsed() {
    return this.raw.bodyUsed
  }
  get cache() {
    return this.raw.cache
  }
  get credentials() {
    return this.raw.credentials
  }
  get integrity() {
    return this.raw.integrity
  }
  get keepalive() {
    return this.raw.keepalive
  }
  get mode() {
    return this.raw.mode
  }
  get referrer() {
    return this.raw.referrer
  }
  get refererPolicy() {
    return this.raw.referrerPolicy
  }
  get signal() {
    return this.raw.signal
  }
}
