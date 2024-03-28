import type { Context } from '../../context.ts'
import type { MiddlewareHandler } from '../../types.ts'

export const cache = (options: {
  cacheName: string
  wait?: boolean
  cacheControl?: string
  vary?: string[]
}): MiddlewareHandler => {
  if (options.wait === undefined) {
    options.wait = false
  }

  const cacheControlDirectives = options.cacheControl
    ?.split(',')
    .map((directive) => directive.toLowerCase())
  // RFC 7231 Section 7.1.4 specifies that "*" is not allowed in Vary header.
  // See: https://datatracker.ietf.org/doc/html/rfc7231#section-7.1.4
  if (options.vary?.includes('*')) {
    throw new Error(
      'Middleware vary configuration cannot include "*", as it disallows effective caching.'
    )
  }

  const addHeader = (c: Context) => {
    if (cacheControlDirectives) {
      const existingDirectives =
        c.res.headers
          .get('Cache-Control')
          ?.split(',')
          .map((d) => d.trim().split('=', 1)[0]) ?? []
      for (const directive of cacheControlDirectives) {
        let [name, value] = directive.trim().split('=', 2)
        name = name.toLowerCase()
        if (!existingDirectives.includes(name)) {
          c.header('Cache-Control', `${name}${value ? `=${value}` : ''}`, { append: true })
        }
      }
    }

    if (options.vary) {
      const existingDirectives =
        c.res.headers
          .get('Vary')
          ?.split(',')
          .map((d) => d.trim()) ?? []

      const vary = Array.from(
        new Set(
          [...existingDirectives, ...options.vary].map((directive) => directive.toLowerCase())
        )
      ).sort()

      if (vary.includes('*')) {
        c.header('Vary', '*')
      } else {
        c.header('Vary', vary.join(', '))
      }
    }
  }

  return async function cache(c, next) {
    const key = c.req.url
    const cache = await caches.open(options.cacheName)
    const response = await cache.match(key)
    if (response) {
      return new Response(response.body, response)
    }

    await next()
    if (!c.res.ok) {
      return
    }
    addHeader(c)
    const res = c.res.clone()
    if (options.wait) {
      await cache.put(key, res)
    } else {
      c.executionCtx.waitUntil(cache.put(key, res))
    }
  }
}
