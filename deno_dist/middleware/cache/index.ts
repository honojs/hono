import type { MiddlewareHandler } from '../../types.ts'

export const cache = (options: {
  cacheName: string
  wait?: boolean
  cacheControl?: string
}): MiddlewareHandler => {
  if (options.wait === undefined) {
    options.wait = false
  }

  const addHeader = (response: Response) => {
    if (options.cacheControl) response.headers.append('Cache-Control', options.cacheControl)
  }

  return async (c, next) => {
    const key = c.req
    const cache = await caches.open(options.cacheName)
    const response = await cache.match(key)
    if (!response) {
      await next()
      addHeader(c.res)
      const response = c.res.clone()
      if (options.wait) {
        await cache.put(key, response)
      } else {
        c.executionCtx.waitUntil(cache.put(key, response))
      }
    } else {
      return response
    }
  }
}
