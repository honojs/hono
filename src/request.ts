import { parseBody } from './utils/body'
import type { BodyData } from './utils/body'
import type { Cookie } from './utils/cookie'
import { parse } from './utils/cookie'
import { getQueryStringFromURL } from './utils/url'

export class HonoRequest<
  ParamKey extends string = string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Data = any
> {
  original: Request

  private paramData: Record<string, string> | undefined
  private headerData: Record<string, string> | undefined
  private queryData: Record<string, string> | undefined
  private bodyData: BodyData | undefined
  private jsonData: any | undefined
  private data: Data | undefined

  constructor(request: Request, paramData?: Record<string, string> | undefined) {
    this.original = request
    this.paramData = paramData
  }

  param(key: ParamKey): string
  param(): Record<ParamKey, string>
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
      this.original.headers.forEach((value, key) => {
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
    const cookie = this.original.headers.get('Cookie')
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
      body = await parseBody<BodyType>(this.original)
      this.bodyData = body
    } else {
      body = this.bodyData as BodyType
    }
    return body
  }

  async json<JSONData = unknown>() {
    // Cache the JSON body
    let jsonData: Partial<JSONData>
    if (!this.jsonData) {
      jsonData = JSON.parse(await this.original.text())
      this.jsonData = jsonData
    } else {
      jsonData = this.jsonData
    }
    return jsonData
  }

  async text() {
    return await this.original.text()
  }

  async arrayBuffer() {
    return await this.original.arrayBuffer()
  }

  async blob() {
    return await this.original.blob()
  }

  async formData() {
    return await this.original.formData()
  }

  valid(data?: unknown) {
    if (!this.data) {
      this.data = {} as Data
    }
    if (data) {
      this.data = data as Data
    }
    return this.data
  }

  get url() {
    return this.original.url
  }
  get method() {
    return this.original.method
  }
  get headers() {
    return this.original.headers
  }
  get redirect() {
    return this.original.redirect
  }
  get body() {
    return this.original.body
  }
  get bodyUsed() {
    return this.original.bodyUsed
  }
  get cache() {
    return this.original.cache
  }
  get credentials() {
    return this.original.credentials
  }
  get integrity() {
    return this.original.integrity
  }
  get keepalive() {
    return this.original.keepalive
  }
  get mode() {
    return this.original.mode
  }
  get referrer() {
    return this.original.referrer
  }
  get refererPolicy() {
    return this.original.referrerPolicy
  }
  get signal() {
    return this.original.signal
  }
}
