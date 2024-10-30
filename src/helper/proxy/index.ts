/**
 * @module
 * Proxy Helper for Hono.
 */

// Typical header names for requests for proxy use
type ProxyRequestHeaderName = 'X-Forwarded-For' | 'X-Forwarded-Proto' | 'X-Forwarded-Host'

interface ProxyRequestInit extends RequestInit {
  /**
   * Headers that are overwritten in requests to the origin server.
   * Specify undefined to delete the header.
   */
  proxySetRequestHeaders?: Partial<Record<ProxyRequestHeaderName, string>> &
    Record<string, string | undefined>
  /**
   * Headers included in the response from the origin server that should be removed in the response to the client.
   */
  proxyDeleteResponseHeaderNames?: string[]
}

interface ProxyFetch {
  (input: RequestInfo | URL, init?: ProxyRequestInit): Promise<Response>
  (input: string | URL | globalThis.Request, init?: ProxyRequestInit): Promise<Response>
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
 *   return proxyFetch(new Request(`http://${originServer}/${c.req.param('path')}`, c.req.raw), {
 *     proxySetRequestHeaders: {
 *       'X-Forwarded-For': '127.0.0.1',
 *       'X-Forwarded-Host': c.req.header('host'),
 *       Authorization: undefined, // do not propagate request headers contained in c.req.raw
 *     },
 *     proxyDeleteResponseHeaderNames: ['Cookie'],
 *   })
 * })
 * ```
 */
export const proxyFetch: ProxyFetch = async (input, proxyInit) => {
  const {
    proxySetRequestHeaders = {},
    proxyDeleteResponseHeaderNames = [],
    ...requestInit
  } = proxyInit ?? {}

  const req = new Request(input, requestInit)
  req.headers.delete('accept-encoding')

  for (const [key, value] of Object.entries(proxySetRequestHeaders)) {
    if (value !== undefined) {
      req.headers.set(key, value)
    } else {
      req.headers.delete(key)
    }
  }

  const res = await fetch(req)
  const resHeaders = new Headers(res.headers)
  if (resHeaders.has('content-encoding')) {
    resHeaders.delete('content-encoding')
    // Content-Length is the size of the compressed content, not the size of the original content
    resHeaders.delete('content-length')
  }
  for (const key of proxyDeleteResponseHeaderNames) {
    resHeaders.delete(key)
  }

  return new Response(res.body, {
    ...res,
    headers: resHeaders,
  })
}
