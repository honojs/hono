/**
 * @module
 * Proxy Helper for Hono.
 */

interface ProxyRequestInit extends RequestInit {
  raw?: Request
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
 *   return proxyFetch(`http://${originServer}/${c.req.param('path')}`, {
 *     headers: {
 *       ...c.req.header(), // optional, specify only when header forwarding is truly necessary.
 *       'X-Forwarded-For': '127.0.0.1',
 *       'X-Forwarded-Host': c.req.header('host'),
 *       Authorization: undefined, // do not propagate request headers contained in c.req.header('Authorization')
 *     },
 *   }).then((res) => {
 *     res.headers.delete('Cookie')
 *     return res
 *   })
 * })
 * 
 * app.any('/proxy/:path', (c) => {
 *   return proxyFetch(`http://${originServer}/${c.req.param('path')}`, {
 *     ...c.req,
 *     headers: {
 *       ...c.req.header(),
 *       'X-Forwarded-For': '127.0.0.1',
 *       'X-Forwarded-Host': c.req.header('host'),
 *       Authorization: undefined, // do not propagate request headers contained in c.req.header('Authorization')
 *     },
 *   })
 * })
 * ```
 */
export const proxyFetch: ProxyFetch = async (input, proxyInit) => {
  const {
    raw,
    ...requestInit
  } = proxyInit ?? {}

  const requestInitRaw: RequestInit & { duplex?: 'half' } = raw
    ? {
        method: raw.method,
        body: raw.body,
        headers: raw.headers,
      }
    : {}
  if (requestInitRaw.body) {
    requestInitRaw.duplex = 'half'
  }

  const req = new Request(input, {
    ...requestInitRaw,
    ...requestInit,
  })
  req.headers.delete('accept-encoding')

  const res = await fetch(req)
  const resHeaders = new Headers(res.headers)
  if (resHeaders.has('content-encoding')) {
    resHeaders.delete('content-encoding')
    // Content-Length is the size of the compressed content, not the size of the original content
    resHeaders.delete('content-length')
  }

  return new Response(res.body, {
    ...res,
    headers: resHeaders,
  })
}
