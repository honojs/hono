import type { Context } from '../../context'
import type { MiddlewareHandler } from '../../types'

export const cache = (options: {
  cacheName: string
  wait?: boolean
  cacheControl?: string
}): MiddlewareHandler => {
  if (options.wait === undefined) {
    options.wait = false
  }

  const directives = options.cacheControl?.split(',').map((directive) => directive.toLowerCase())

  const addHeader = (c: Context) => {
    if (directives) {
      const existingDirectives =
        c.res.headers
          .get('Cache-Control')
          ?.split(',')
          .map((d) => d.trim().split('=', 1)[0]) ?? []
      for (const directive of directives) {
        let [name, value] = directive.trim().split('=', 2)
        name = name.toLowerCase()
        if (!existingDirectives.includes(name)) {
          c.header('Cache-Control', `${name}${value ? `=${value}` : ''}`, { append: true })
        }
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
