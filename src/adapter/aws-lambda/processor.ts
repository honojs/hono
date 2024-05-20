import { encodeBase64 } from '../../utils/encode'
import type { LambdaEvent, LambdaRequestEvent, APIGatewayProxyResult, APIGatewayProxyEventV2, APIGatewayProxyEvent, ALBProxyEvent } from './handler'
import { isContentTypeBinary, isContentEncodingBinary } from './handler'

abstract class EventProcessor<E extends LambdaEvent> {
  abstract createRequest(event: E): Request

  abstract createResult(event: E, res: Response): Promise<any>
}

abstract class RequestEventProcessor<E extends LambdaRequestEvent> extends EventProcessor<E> {
  protected abstract getPath(event: E): string

  protected abstract getMethod(event: E): string

  protected abstract getQueryString(event: E): string

  protected abstract getHeaders(event: E): Headers

  protected abstract getCookies(event: E, headers: Headers): void

  protected abstract setCookiesToResult(
    event: E,
    result: APIGatewayProxyResult,
    cookies: string[]
  ): void

  createRequest(event: E): Request {
    const queryString = this.getQueryString(event)
    const domainName =
      event.requestContext && 'domainName' in event.requestContext
        ? event.requestContext.domainName
        : event.headers?.host ?? event.multiValueHeaders?.host?.[0]
    const path = this.getPath(event)
    const urlPath = `https://${domainName}${path}`
    const url = queryString ? `${urlPath}?${queryString}` : urlPath

    const headers = this.getHeaders(event)

    const method = this.getMethod(event)
    const requestInit: RequestInit = {
      headers,
      method,
    }

    if (event.body) {
      requestInit.body = event.isBase64Encoded ? Buffer.from(event.body, 'base64') : event.body
    }

    return new Request(url, requestInit)
  }

  async createResult(event: E, res: Response): Promise<APIGatewayProxyResult> {
    const contentType = res.headers.get('content-type')
    let isBase64Encoded = !!(contentType && isContentTypeBinary(contentType))

    if (!isBase64Encoded) {
      const contentEncoding = res.headers.get('content-encoding')
      isBase64Encoded = isContentEncodingBinary(contentEncoding)
    }

    const body = isBase64Encoded ? encodeBase64(await res.arrayBuffer()) : await res.text()

    const result: APIGatewayProxyResult = {
      body,
      headers: {},
      multiValueHeaders: event.multiValueHeaders ? {} : undefined,
      statusCode: res.status,
      isBase64Encoded,
    }

    this.setCookies(event, res, result)
    res.headers.forEach((value, key) => {
      result.headers[key] = value
      if (event.multiValueHeaders && result.multiValueHeaders) {
        result.multiValueHeaders[key] = [value]
      }
    })

    return result
  }

  setCookies(event: E, res: Response, result: APIGatewayProxyResult) {
    if (res.headers.has('set-cookie')) {
      const cookies = res.headers.get('set-cookie')?.split(', ')
      if (Array.isArray(cookies)) {
        this.setCookiesToResult(event, result, cookies)
        res.headers.delete('set-cookie')
      }
    }
  }
}

const v2Processor =
  new (class EventV2Processor extends RequestEventProcessor<APIGatewayProxyEventV2> {
    protected getPath(event: APIGatewayProxyEventV2): string {
      return event.rawPath
    }

    protected getMethod(event: APIGatewayProxyEventV2): string {
      return event.requestContext.http.method
    }

    protected getQueryString(event: APIGatewayProxyEventV2): string {
      return event.rawQueryString
    }

    protected getCookies(event: APIGatewayProxyEventV2, headers: Headers): void {
      if (Array.isArray(event.cookies)) {
        headers.set('Cookie', event.cookies.join('; '))
      }
    }

    protected setCookiesToResult(
      _: APIGatewayProxyEventV2,
      result: APIGatewayProxyResult,
      cookies: string[]
    ): void {
      result.cookies = cookies
    }

    protected getHeaders(event: APIGatewayProxyEventV2): Headers {
      const headers = new Headers()
      this.getCookies(event, headers)
      if (event.headers) {
        for (const [k, v] of Object.entries(event.headers)) {
          if (v) {
            headers.set(k, v)
          }
        }
      }
      return headers
    }
  })()

const v1Processor = new (class EventV1Processor extends RequestEventProcessor<
  Exclude<LambdaRequestEvent, APIGatewayProxyEventV2>
> {
  protected getPath(event: Exclude<LambdaRequestEvent, APIGatewayProxyEventV2>): string {
    return event.path
  }

  protected getMethod(event: Exclude<LambdaRequestEvent, APIGatewayProxyEventV2>): string {
    return event.httpMethod
  }

  protected getQueryString(event: Exclude<LambdaRequestEvent, APIGatewayProxyEventV2>): string {
    return Object.entries(event.queryStringParameters || {})
      .filter(([, value]) => value)
      .map(([key, value]) => `${key}=${value}`)
      .join('&')
  }

  protected getCookies(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    event: Exclude<LambdaRequestEvent, APIGatewayProxyEventV2>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    headers: Headers
  ): void {
    // nop
  }

  protected getHeaders(event: APIGatewayProxyEvent): Headers {
    const headers = new Headers()
    this.getCookies(event, headers)
    if (event.headers) {
      for (const [k, v] of Object.entries(event.headers)) {
        if (v) {
          headers.set(k, v)
        }
      }
    }
    if (event.multiValueHeaders) {
      for (const [k, values] of Object.entries(event.multiValueHeaders)) {
        if (values) {
          // avoid duplicating already set headers
          const foundK = headers.get(k)
          values.forEach((v) => (!foundK || !foundK.includes(v)) && headers.append(k, v))
        }
      }
    }
    return headers
  }

  protected setCookiesToResult(
    _: APIGatewayProxyEvent,
    result: APIGatewayProxyResult,
    cookies: string[]
  ): void {
    result.multiValueHeaders = {
      'set-cookie': cookies,
    }
  }
})()

const albProcessor = new (class ALBProcessor extends RequestEventProcessor<ALBProxyEvent> {
  protected getHeaders(event: ALBProxyEvent): Headers {
    const headers = new Headers()
    // if multiValueHeaders is present the ALB will use it instead of the headers field
    // https://docs.aws.amazon.com/elasticloadbalancing/latest/application/lambda-functions.html#multi-value-headers
    if (event.multiValueHeaders) {
      for (const [key, values] of Object.entries(event.multiValueHeaders)) {
        if (values && Array.isArray(values)) {
          // https://www.rfc-editor.org/rfc/rfc9110.html#name-common-rules-for-defining-f
          headers.set(key, values.join('; '))
        }
      }
    } else {
      for (const [key, value] of Object.entries(event.headers ?? {})) {
        if (value) {
          headers.set(key, value)
        }
      }
    }
    return headers
  }
  protected setHeadersToResult(
    event: ALBProxyEvent,
    result: APIGatewayProxyResult,
    headers: Headers
  ): void {
    // When multiValueHeaders is present in event set multiValueHeaders in result
    if (event.multiValueHeaders) {
      const multiValueHeaders: { [key: string]: string[] } = {}
      for (const [key, value] of headers.entries()) {
        multiValueHeaders[key] = [value]
      }
      result.multiValueHeaders = multiValueHeaders
    } else {
      const singleValueHeaders: Record<string, string> = {}
      for (const [key, value] of headers.entries()) {
        singleValueHeaders[key] = value
      }
      result.headers = singleValueHeaders
    }
  }
  protected getPath(event: ALBProxyEvent): string {
    return event.path
  }

  protected getMethod(event: ALBProxyEvent): string {
    return event.httpMethod
  }

  protected getQueryString(event: ALBProxyEvent): string {
    return Object.entries(event.queryStringParameters || {})
      .filter(([, value]) => value)
      .map(([key, value]) => `${key}=${value}`)
      .join('&')
  }

  protected getCookies(event: ALBProxyEvent, headers: Headers): void {
    let cookie
    if (event.multiValueHeaders) {
      cookie = event.multiValueHeaders['cookie']?.join('; ')
    } else {
      cookie = event.headers ? event.headers['cookie'] : undefined
    }
    if (cookie) {
      headers.append('Cookie', cookie)
    }
  }

  protected setCookiesToResult(
    event: ALBProxyEvent,
    result: APIGatewayProxyResult,
    cookies: string[]
  ): void {
    // when multi value headers is enabled
    if (event.multiValueHeaders && result.multiValueHeaders) {
      result.multiValueHeaders['set-cookie'] = cookies
    } else {
      // otherwise serialize the set-cookie
      result.headers['set-cookie'] = cookies.join(', ')
    }
  }
})()

export const getProcessor = (event: LambdaEvent): EventProcessor<LambdaEvent> => {
  if (isProxyEventALB(event)) {
    return albProcessor
  }
  if (isProxyEventV2(event)) {
    return v2Processor
  }
  return v1Processor
}

const isProxyEventALB = (event: LambdaEvent): event is ALBProxyEvent => {
  return (
    Object.prototype.hasOwnProperty.call(event, 'requestContext') &&
    Object.prototype.hasOwnProperty.call((event as LambdaRequestEvent).requestContext, 'elb')
  )
}

const isProxyEventV2 = (event: LambdaEvent): event is APIGatewayProxyEventV2 => {
  return Object.prototype.hasOwnProperty.call(event, 'rawPath')
}
