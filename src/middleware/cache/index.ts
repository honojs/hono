/**
 * @module
 * Cache Middleware for Hono.
 */

import type { Context } from '../../context'
import { cloneRawRequest } from '../../request'
import type { MiddlewareHandler } from '../../types'
import { sha256 } from '../../utils/crypto'
import type { StatusCode } from '../../utils/http-status'

/**
 * status codes that can be cached by default.
 */
const defaultCacheableStatusCodes: ReadonlyArray<StatusCode> = [200]

const defaultMaxQueryBodySize = 64 * 1024

const queryRepresentationMetadataHeaders = [
  'content-type',
  'content-encoding',
  'content-language',
  'content-location',
] as const

const shouldSkipCacheControl = (cacheControl: string | null): boolean =>
  !!cacheControl && /(?:^|,\s*)(?:private|no-(?:store|cache))(?:\s*(?:=|,|$))/i.test(cacheControl)

const parseVaryDirectives = (vary: string | string[] | null | undefined): string[] => {
  if (vary == null) {
    return []
  }
  return (Array.isArray(vary) ? vary : vary.split(','))
    .map((directive) => directive.trim().toLowerCase())
    .filter(Boolean)
}

const shouldSkipCache = (
  res: Response,
  optionsVaryDirectives: Set<string> | undefined,
  responseVary: string[]
): boolean =>
  (responseVary.length &&
    (!optionsVaryDirectives || responseVary.some((name) => !optionsVaryDirectives.has(name)))) ||
  shouldSkipCacheControl(res.headers.get('Cache-Control')) ||
  res.headers.has('Set-Cookie')

const createQueryCacheKey = async (
  c: Context,
  maxQueryBodySize: number
): Promise<string | null> => {
  if (!globalThis.crypto?.subtle) {
    return null
  }

  if (c.req.raw.bodyUsed && Object.keys(c.req.bodyCache)[0] === 'formData') {
    // FormData cannot be reserialized with a stable multipart boundary after
    // the original request body has been consumed.
    return undefined
  }

  try {
    // RFC 10008 Section 2.7 requires QUERY cache keys to incorporate the
    // request content and its related representation metadata.
    const requestHeaders = c.req.raw.headers
    const metadata = new TextEncoder().encode(
      JSON.stringify(
        queryRepresentationMetadataHeaders.map((header) => [header, requestHeaders.get(header)])
      )
    )
    const body = (await cloneRawRequest(c.req)).body
    const chunks: Uint8Array[] = []
    let bodySize = 0

    if (body) {
      const reader = body.getReader()
      for (;;) {
        const { done, value } = await reader.read()
        if (done) {
          break
        }
        bodySize += value.byteLength
        if (bodySize > maxQueryBodySize) {
          // Do not await cancellation because a cloned stream's cancellation
          // can wait for the original request stream to finish.
          void reader.cancel().catch(() => {})
          return null
        }
        chunks.push(value)
      }
    }

    const data = new Uint8Array(metadata.byteLength + bodySize)
    data.set(metadata)
    let offset = metadata.byteLength
    for (const chunk of chunks) {
      data.set(chunk, offset)
      offset += chunk.byteLength
    }

    return await sha256(data)
  } catch {
    // A QUERY response cannot be cached safely if its content cannot be read.
    return null
  }
}

/**
 * Cache Middleware for Hono.
 *
 * @see {@link https://hono.dev/docs/middleware/builtin/cache}
 *
 * @param {Object} options - The options for the cache middleware.
 * @param {string | Function} options.cacheName - The name of the cache. Can be used to store multiple caches with different identifiers.
 * @param {boolean} [options.wait=false] - A boolean indicating if Hono should wait for the Promise of the `cache.put` function to resolve before continuing with the request. Required to be true for the Deno environment.
 * @param {string} [options.cacheControl] - A string of directives for the `Cache-Control` header.
 * @param {string | string[]} [options.vary] - Adds the configured request headers to the cache key variants and sets the `Vary` header in the response. If the original response header already contains a `Vary` header, the values are merged, removing any duplicates.
 * @param {Function} [options.keyGenerator] - Generates keys for every request in the `cacheName` store. This can be used to cache data based on request parameters or context parameters. QUERY keys additionally include a digest of the request content and its representation metadata.
 * @param {number} [options.maxQueryBodySize=65536] - The maximum QUERY request body size in bytes that can be cached. Larger QUERY requests bypass the cache.
 * @param {number[]} [options.cacheableStatusCodes=[200]] - An array of status codes that can be cached.
 * @param {Function | false} [options.onCacheNotAvailable] - A callback invoked when `globalThis.caches` is not available. By default, a message is logged to the console. Set to `false` to suppress the log, or provide a custom function.
 * @returns {MiddlewareHandler} The middleware handler function.
 * @throws {Error} If the `vary` option includes "*".
 *
 * @example
 * ```ts
 * app.get(
 *   '*',
 *   cache({
 *     cacheName: 'my-app',
 *     cacheControl: 'max-age=3600',
 *   })
 * )
 * ```
 */
export const cache = (options: {
  cacheName: string | ((c: Context) => Promise<string> | string)
  wait?: boolean
  cacheControl?: string
  vary?: string | string[]
  keyGenerator?: (c: Context) => Promise<string> | string
  maxQueryBodySize?: number
  cacheableStatusCodes?: StatusCode[]
  onCacheNotAvailable?: (() => void) | false
}): MiddlewareHandler => {
  if (!globalThis.caches) {
    if (options.onCacheNotAvailable === false) {
      // suppress log
    } else if (options.onCacheNotAvailable) {
      options.onCacheNotAvailable()
    } else {
      console.log('Cache Middleware is not enabled because caches is not defined.')
    }
    return async (_c, next) => await next()
  }

  if (options.wait === undefined) {
    options.wait = false
  }

  const cacheControlDirectives = options.cacheControl
    ?.split(',')
    .map((directive) => directive.toLowerCase())
  const optionsVaryList = parseVaryDirectives(options.vary)
  const varyDirectives = optionsVaryList.length ? new Set(optionsVaryList) : undefined
  // RFC 7231 Section 7.1.4 specifies that "*" is not allowed in Vary header.
  // See: https://datatracker.ietf.org/doc/html/rfc7231#section-7.1.4
  if (varyDirectives?.has('*')) {
    throw new Error(
      'Middleware vary configuration cannot include "*", as it disallows effective caching.'
    )
  }

  const cacheableStatusCodes = new Set<number>(
    options.cacheableStatusCodes ?? defaultCacheableStatusCodes
  )
  const maxQueryBodySize = options.maxQueryBodySize ?? defaultMaxQueryBodySize

  const addHeader = (c: Context, responseVary: string[]) => {
    if (cacheControlDirectives) {
      const existingDirectives =
        c.res.headers
          .get('Cache-Control')
          ?.split(',')
          // Directive names are case-insensitive (RFC 7234 §5.2); lower-case so
          // the case-insensitive de-dup check below matches handler-set names
          // like `Max-Age`.
          .map((d) => d.trim().split('=', 1)[0].toLowerCase()) ?? []
      for (const directive of cacheControlDirectives) {
        let [name, value] = directive.trim().split('=', 2)
        name = name.toLowerCase()
        if (!existingDirectives.includes(name)) {
          c.header('Cache-Control', `${name}${value ? `=${value}` : ''}`, { append: true })
        }
      }
    }

    if (varyDirectives) {
      if (responseVary.length === 0) {
        c.header('Vary', Array.from(varyDirectives).join(', '))
      } else {
        const merged = new Set(varyDirectives)
        for (const directive of responseVary) {
          merged.add(directive)
        }
        if (merged.has('*')) {
          c.header('Vary', '*')
        } else {
          c.header('Vary', Array.from(merged).join(', '))
        }
      }
    }
  }

  return async function cache(c, next) {
    if (
      (c.req.method !== 'GET' && c.req.method !== 'QUERY') ||
      c.req.raw.headers.has('Authorization')
    ) {
      await next()
      return
    }

    const queryCacheKey =
      c.req.method === 'QUERY' ? await createQueryCacheKey(c, maxQueryBodySize) : undefined
    if (queryCacheKey === null) {
      await next()
      return
    }

    let key = c.req.url
    if (options.keyGenerator) {
      key = await options.keyGenerator(c)
    }
    if (queryCacheKey) {
      key += `::query=${queryCacheKey}`
    }
    if (varyDirectives) {
      for (const directive of varyDirectives) {
        const value = c.req.raw.headers.get(directive) ?? ''
        key += `::${directive}=${encodeURIComponent(value)}`
      }
    }

    const cacheName =
      typeof options.cacheName === 'function' ? await options.cacheName(c) : options.cacheName
    const cache = await caches.open(cacheName)
    const response = await cache.match(key)
    if (response) {
      return new Response(response.body, response)
    }

    await next()
    if (!cacheableStatusCodes.has(c.res.status)) {
      return
    }
    const responseVary = parseVaryDirectives(c.res.headers.get('Vary'))
    addHeader(c, responseVary)

    if (shouldSkipCache(c.res, varyDirectives, responseVary)) {
      return
    }

    const res = c.res.clone()
    if (options.wait) {
      await cache.put(key, res)
    } else {
      c.executionCtx.waitUntil(cache.put(key, res))
    }
  }
}
