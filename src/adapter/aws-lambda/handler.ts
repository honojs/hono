// @denoify-ignore
import crypto from 'crypto'
import type { Hono } from '../../hono'

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
globalThis.crypto = crypto

interface APIGatewayEvent {
  httpMethod: string
  headers: Record<string, string | undefined>
  path: string
  body: string | null
  isBase64Encoded: boolean
  requestContext: {
    domainName: string
  }
}

interface APIGatewayProxyResult {
  statusCode: number
  body: string
  headers: Record<string, string>
  isBase64Encoded: boolean
}

export const handle = (app: Hono) => {
  return async (event: APIGatewayEvent): Promise<APIGatewayProxyResult> => {
    const req = createRequest(event)
    const res = await app.fetch(req)
    const arrayBuffer = await res.arrayBuffer()
    const result: APIGatewayProxyResult = {
      statusCode: res.status,
      body: String.fromCharCode(...new Uint8Array(arrayBuffer)),
      headers: {},
      isBase64Encoded: false,
    }

    res.headers.forEach((value, key) => {
      result.headers[key] = value
    })

    return result
  }
}

const createRequest = (event: APIGatewayEvent) => {
  const url = `https://${event.requestContext.domainName}${event.path}`
  const headers = new Headers()
  for (const [k, v] of Object.entries(event.headers)) {
    if (v) headers.set(k, v)
  }
  const method = event.httpMethod

  const requestInit: RequestInit = {
    headers: headers,
    method: method,
  }

  if (event.body) {
    requestInit.body = event.isBase64Encoded ? atob(event.body) : event.body
  }
  return new Request(url, requestInit)
}
