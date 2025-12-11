/**
 * @module
 * Proxy Helper for Hono.
 */

import { HTTPException } from '../../http-exception'
import type { RequestHeader } from '../../utils/headers'

// https://datatracker.ietf.org/doc/html/rfc2616#section-13.5.1
const hopByHopHeaders = [
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
]

// https://datatracker.ietf.org/doc/html/rfc9110#section-5.6.2
const ALLOWED_TOKEN_PATTERN = /^[!#$%&'*+\-.0-9A-Z^_`a-z|~]+$/

interface ProxyRequestInit extends Omit<RequestInit, 'headers'> {
  raw?: Request
  headers?:
    | HeadersInit
    | [string, string][]
    | Record<RequestHeader, string | undefined>
    | Record<string, string | undefined>
  customFetch?: (request: Request) => Promise<Response>
  /**
   * Enable strict RFC 9110 compliance for Connection header processing.
   *
   * - `false` (default): Ignores Connection header to prevent potential
   *   Hop-by-Hop Header Injection attacks. Recommended for untrusted clients.
   * - `true`: Processes Connection header per RFC 9110 and removes listed headers.
   *   Only use in trusted environments.
   *
   * @default false
   * @see https://datatracker.ietf.org/doc/html/rfc9110#section-7.6.1
   */
  strictConnectionProcessing?: boolean
}

interface ProxyFetch {
  (input: string | URL | Request, init?: ProxyRequestInit): Promise<Response>
}

const buildRequestInitFromRequest = (
  request: Request | undefined,
  strictConnectionProcessing: boolean
): RequestInit & { duplex?: 'half' } => {
  if (!request) {
    return {}
  }

  const headers = new Headers(request.headers)

  if (strictConnectionProcessing) {
    // https://datatracker.ietf.org/doc/html/rfc9110#section-7.6.1
    // Parse Connection header and remove listed headers (MUST per RFC 9110)
    const connectionValue = headers.get('connection')
    if (connectionValue) {
      const headerNames = connectionValue.split(',').map((h) => h.trim())
      // Validate header names per RFC 9110 Section 5.6.2 (token syntax)
      const invalidHeaders = headerNames.filter((h) => !ALLOWED_TOKEN_PATTERN.test(h))

      if (invalidHeaders.length > 0) {
        throw new HTTPException(400, {
          message: `Invalid Connection header value: ${invalidHeaders.join(', ')}`,
        })
      }
      headerNames.forEach((headerName) => {
        headers.delete(headerName)
      })
    }
  }

  hopByHopHeaders.forEach((header) => {
    headers.delete(header)
  })

  return {
    method: request.method,
    body: request.body,
    duplex: request.body ? 'half' : undefined,
    headers,
    signal: request.signal,
  }
}

const preprocessRequestInit = (requestInit: RequestInit): RequestInit => {
  if (
    !requestInit.headers ||
    Array.isArray(requestInit.headers) ||
    requestInit.headers instanceof Headers
  ) {
    return requestInit
  }

  const headers = new Headers()
  for (const [key, value] of Object.entries(requestInit.headers)) {
    if (value == null) {
      // delete header if value is null or undefined
      headers.delete(key)
    } else {
      headers.set(key, value)
    }
  }
  requestInit.headers = headers
  return requestInit
}

/**
 * Fetch API wrapper for proxy.
 * The parameters and return value are the same as for `fetch` (except for the proxy-specific options).
 *
 * The “Accept-Encoding” header is replaced with an encoding that the current runtime can handle.
 * Unnecessary response headers are deleted and a Response object is returned that can be returned
 * as is as a response from the handler.
 *
 * @example
 * ```ts
 * app.get('/proxy/:path', (c) => {
 *   return proxy(`http://${originServer}/${c.req.param('path')}`, {
 *     headers: {
 *       ...c.req.header(), // optional, specify only when forwarding all the request data (including credentials) is necessary.
 *       'X-Forwarded-For': '127.0.0.1',
 *       'X-Forwarded-Host': c.req.header('host'),
 *       Authorization: undefined, // do not propagate request headers contained in c.req.header('Authorization')
 *     },
 *   }).then((res) => {
 *     res.headers.delete('Set-Cookie')
 *     return res
 *   })
 * })
 *
 * app.all('/proxy/:path', (c) => {
 *   return proxy(`http://${originServer}/${c.req.param('path')}`, {
 *     ...c.req, // optional, specify only when forwarding all the request data (including credentials) is necessary.
 *     headers: {
 *       ...c.req.header(),
 *       'X-Forwarded-For': '127.0.0.1',
 *       'X-Forwarded-Host': c.req.header('host'),
 *       Authorization: undefined, // do not propagate request headers contained in c.req.header('Authorization')
 *     },
 *   })
 * })
 *
 * // Strict RFC compliance mode (use only in trusted environments)
 * app.get('/internal-proxy/:path', (c) => {
 *   return proxy(`http://${internalServer}/${c.req.param('path')}`, {
 *     ...c.req,
 *     strictConnectionProcessing: true,
 *   })
 * })
 * ```
 */
export const proxy: ProxyFetch = async (input, proxyInit) => {
  const {
    raw,
    customFetch,
    strictConnectionProcessing = false,
    ...requestInit
  } = proxyInit instanceof Request ? { raw: proxyInit } : (proxyInit ?? {})

  const req = new Request(input, {
    ...buildRequestInitFromRequest(raw, strictConnectionProcessing),
    ...preprocessRequestInit(requestInit as RequestInit),
  })
  req.headers.delete('accept-encoding')

  const res = await (customFetch || fetch)(req)
  const resHeaders = new Headers(res.headers)
  hopByHopHeaders.forEach((header) => {
    resHeaders.delete(header)
  })
  if (resHeaders.has('content-encoding')) {
    resHeaders.delete('content-encoding')
    // Content-Length is the size of the compressed content, not the size of the original content
    resHeaders.delete('content-length')
  }

  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers: resHeaders,
  })
}
