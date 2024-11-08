import type { Hono } from '../../hono'
import type { Env, Schema } from '../../types'
import { decodeBase64, encodeBase64 } from '../../utils/encode'
import type {
  AlibabaCloudFC3Context,
  AlibabaCloudFC3Event,
  AlibabaCloudFC3EventRaw,
  AlibabaCloudFC3Handler,
} from './types'

const parseEvent = (event: AlibabaCloudFC3EventRaw): AlibabaCloudFC3Event => {
  return JSON.parse(event.toString('utf-8'))
}

/**
 * Accepts events from Alibaba Cloud FC3 and return Alibaba Cloud FC3 responses
 */
export const handle = <E extends Env = Env, S extends Schema = {}, BasePath extends string = '/'>(
  app: Hono<E, S, BasePath>
): AlibabaCloudFC3Handler => {
  return async (eventRaw: AlibabaCloudFC3EventRaw, context: AlibabaCloudFC3Context) => {
    const event = parseEvent(eventRaw)
    const req = createRequest(event)
    const res = await app.fetch(req, {
      event,
      context,
    })

    return createResponse(res)
  }
}

export const createRequest = (event: AlibabaCloudFC3Event): Request => {
  const queryString = Object.entries(event.queryParameters || {})
    .map(([key, value]) => `${key}=${value}`)
    .join('&')

  const url = `https://${event.requestContext.domainName}${event.rawPath}${
    queryString ? `?${queryString}` : ''
  }`

  const headers = new Headers()
  if (event.headers) {
    for (const [key, value] of Object.entries(event.headers)) {
      headers.set(key, value)
    }
  }

  const method = event.requestContext.http.method
  const requestInit: RequestInit = {
    headers,
    method,
  }

  if (event.body) {
    requestInit.body = event.isBase64Encoded ? decodeBase64(event.body) : event.body
  }

  return new Request(url, requestInit)
}

export const createResponse = async (res: Response) => {
  const contentType = res.headers.get('content-type')
  let isBase64Encoded = contentType && isContentTypeBinary(contentType) ? true : false

  if (!isBase64Encoded) {
    const contentEncoding = res.headers.get('content-encoding')
    isBase64Encoded = isContentEncodingBinary(contentEncoding)
  }

  const body = isBase64Encoded ? encodeBase64(await res.arrayBuffer()) : await res.text()

  const headers: Record<string, string> = {}
  res.headers.forEach((value, key) => {
    headers[key] = value
  })

  return {
    statusCode: res.status,
    headers,
    body,
    isBase64Encoded,
  }
}

export const isContentTypeBinary = (contentType: string) => {
  return !/^(text\/(plain|html|css|javascript|csv).*|application\/(.*json|.*xml).*|image\/svg\+xml.*)$/.test(
    contentType
  )
}

export const isContentEncodingBinary = (contentEncoding: string | null) => {
  if (contentEncoding === null) {
    return false
  }
  return /^(gzip|deflate|compress|br)/.test(contentEncoding)
}
