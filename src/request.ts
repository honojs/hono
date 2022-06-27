export class HonoRequest<ParamKeyType extends string = string> extends Request {
  param: {
    (key: ParamKeyType): string
    (): Record<ParamKeyType, string>
  }
  paramData?: Record<ParamKeyType, string>
  query: {
    (key: string): string
    (): Record<string, string>
  }
  queries: {
    (key: string): string[]
    (): Record<string, string[]>
  }
  header: {
    (name: string): string
    (): Record<string, string>
  }
}

export function extendHonoRequest(request: HonoRequest): HonoRequest {
  request.param = function (this: HonoRequest, key?: string) {
    if (this.paramData) {
      if (key) {
        return this.paramData[key]
      } else {
        return this.paramData
      }
    }
    return null
  } as InstanceType<typeof HonoRequest>['param']

  request.header = function (this: HonoRequest, name?: string) {
    if (name) {
      return this.headers.get(name)
    } else {
      const result: Record<string, string> = {}
      for (const [key, value] of this.headers) {
        result[key] = value
      }
      return result
    }
  } as InstanceType<typeof HonoRequest>['header']

  request.query = function (this: HonoRequest, key?: string) {
    const url = new URL(this.url)
    if (key) {
      return url.searchParams.get(key)
    } else {
      const result: Record<string, string> = {}
      for (const key of url.searchParams.keys()) {
        result[key] = url.searchParams.get(key) || ''
      }
      return result
    }
  } as InstanceType<typeof HonoRequest>['query']

  request.queries = function (this: HonoRequest, key?: string) {
    const url = new URL(this.url)
    if (key) {
      return url.searchParams.getAll(key)
    } else {
      const result: Record<string, string[]> = {}
      for (const key of url.searchParams.keys()) {
        result[key] = url.searchParams.getAll(key)
      }
      return result
    }
  } as InstanceType<typeof HonoRequest>['queries']

  return request
}
