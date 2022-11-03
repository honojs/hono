import { parseBody } from './utils/body.ts'
import type { BodyData } from './utils/body.ts'
import type { Cookie } from './utils/cookie.ts'
import { parse } from './utils/cookie.ts'
import { getQueryStringFromURL } from './utils/url.ts'

type ValidatedData = Record<string, any>

declare global {
  interface Request<
    ParamKeyType extends string = string,
    Data extends ValidatedData = ValidatedData
  > {
    paramData?: Record<ParamKeyType, string>
    param: {
      (key: ParamKeyType): string
      (): Record<ParamKeyType, string>
    }
    queryData?: Record<string, string>
    query: {
      (key: string): string
      (): Record<string, string>
    }
    queries: {
      (key: string): string[]
      (): Record<string, string[]>
    }
    headerData?: Record<string, string>
    header: {
      (name: string): string
      (): Record<string, string>
    }
    cookie: {
      (name: string): string
      (): Cookie
    }
    bodyData?: BodyData
    parseBody<BodyType extends BodyData>(): Promise<BodyType>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jsonData?: any
    json<T>(): Promise<T>
    data: Data
    valid: {
      (key: string | string[], value: unknown): Data
      (): Data
    }
  }
}

export function extendRequestPrototype() {
  if (!!Request.prototype.param as boolean) {
    // already extended
    return
  }

  Request.prototype.param = function (this: Request, key?: string) {
    if (this.paramData) {
      if (key) {
        return this.paramData[key]
      } else {
        return this.paramData
      }
    }
    return null
  } as InstanceType<typeof Request>['param']

  Request.prototype.header = function (this: Request, name?: string) {
    if (!this.headerData) {
      this.headerData = {}
      for (const [key, value] of this.headers) {
        this.headerData[key] = value
      }
    }
    if (name) {
      return this.headerData[name.toLowerCase()]
    } else {
      return this.headerData
    }
  } as InstanceType<typeof Request>['header']

  Request.prototype.query = function (this: Request, key?: string) {
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
  } as InstanceType<typeof Request>['query']

  Request.prototype.queries = function (this: Request, key?: string) {
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
  } as InstanceType<typeof Request>['queries']

  Request.prototype.cookie = function (this: Request, key?: string) {
    const cookie = this.headers.get('Cookie') || ''
    const obj = parse(cookie)
    if (key) {
      const value = obj[key]
      return value
    } else {
      return obj
    }
  } as InstanceType<typeof Request>['cookie']

  Request.prototype.parseBody = async function <BodyType extends BodyData>(
    this: Request
  ): Promise<BodyType> {
    // Cache the parsed body
    let body: BodyType
    if (!this.bodyData) {
      body = await parseBody<BodyType>(this)
      this.bodyData = body
    } else {
      body = this.bodyData as BodyType
    }
    return body
  } as InstanceType<typeof Request>['parseBody']

  Request.prototype.json = async function <JSONData = unknown>(this: Request) {
    // Cache the JSON body
    let jsonData: Partial<JSONData>
    if (!this.jsonData) {
      jsonData = JSON.parse(await this.text())
      this.jsonData = jsonData
    } else {
      jsonData = this.jsonData
    }
    return jsonData
  } as InstanceType<typeof Request>['jsonData']

  Request.prototype.valid = function (this: Request, keys?: string | string[], value?: unknown) {
    if (!this.data) {
      this.data = {}
    }
    if (keys !== undefined) {
      if (typeof keys === 'string') {
        keys = [keys]
      }
      let data = this.data
      for (let i = 0; i < keys.length - 1; i++) {
        data = data[keys[i]] ||= {}
      }
      data[keys[keys.length - 1]] = value
    }
    return this.data
  } as InstanceType<typeof Request>['valid']
}
