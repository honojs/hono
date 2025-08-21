/**
 * @module
 * ETag Middleware for Hono.
 */

import type { MiddlewareHandler } from '../../types'
import { generateDigest } from './digest'

type ETagOptions = {
  retainedHeaders?: string[]
  weak?: boolean
  generateDigest?: (body: Uint8Array<ArrayBuffer>) => ArrayBuffer | Promise<ArrayBuffer>
}

/**
 * Default headers to pass through on 304 responses. From the spec:
 * > The response must not contain a body and must include the headers that
 * > would have been sent in an equivalent 200 OK response: Cache-Control,
 * > Content-Location, Date, ETag, Expires, and Vary.
 */
export const RETAINED_304_HEADERS = [
  'cache-control',
  'content-location',
  'date',
  'etag',
  'expires',
  'vary',
]

const stripWeak = (tag: string) => tag.replace(/^W\//, '')

function etagMatches(etag: string, ifNoneMatch: string | null) {
  return (
    ifNoneMatch != null && ifNoneMatch.split(/,\s*/).some((t) => stripWeak(t) === stripWeak(etag))
  )
}

function initializeGenerator(
  generator?: ETagOptions['generateDigest']
): ETagOptions['generateDigest'] | undefined {
  if (!generator) {
    if (crypto && crypto.subtle) {
      generator = (body: Uint8Array<ArrayBuffer>) =>
        crypto.subtle.digest(
          {
            name: 'SHA-1',
          },
          body.buffer
        )
    }
  }

  return generator
}

/**
 * ETag Middleware for Hono.
 *
 * @see {@link https://hono.dev/docs/middleware/builtin/etag}
 *
 * @param {ETagOptions} [options] - The options for the ETag middleware.
 * @param {boolean} [options.weak=false] - Define using or not using a weak validation. If true is set, then `W/` is added to the prefix of the value.
 * @param {string[]} [options.retainedHeaders=RETAINED_304_HEADERS] - The headers that you want to retain in the 304 Response.
 * @param {function(Uint8Array): ArrayBuffer | Promise<ArrayBuffer>} [options.generateDigest] -
 * A custom digest generation function. By default, it uses 'SHA-1'
 * This function is called with the response body as a `Uint8Array` and should return a hash as an `ArrayBuffer` or a Promise of one.
 * @returns {MiddlewareHandler} The middleware handler function.
 *
 * @example
 * ```ts
 * const app = new Hono()
 *
 * app.use('/etag/*', etag())
 * app.get('/etag/abc', (c) => {
 *   return c.text('Hono is hot')
 * })
 * ```
 */
export const etag = (options?: ETagOptions): MiddlewareHandler => {
  const retainedHeaders = options?.retainedHeaders ?? RETAINED_304_HEADERS
  const weak = options?.weak ?? false
  const generator = initializeGenerator(options?.generateDigest)

  return async function etag(c, next) {
    const ifNoneMatch = c.req.header('If-None-Match') ?? null

    await next()

    const res = c.res as Response
    let etag = res.headers.get('ETag')

    if (!etag) {
      if (!generator) {
        return
      }
      const hash = await generateDigest(res.clone().body, generator)
      if (hash === null) {
        return
      }
      etag = weak ? `W/"${hash}"` : `"${hash}"`
    }

    if (etagMatches(etag, ifNoneMatch)) {
      c.res = new Response(null, {
        status: 304,
        statusText: 'Not Modified',
        headers: {
          ETag: etag,
        },
      })
      c.res.headers.forEach((_, key) => {
        if (retainedHeaders.indexOf(key.toLowerCase()) === -1) {
          c.res.headers.delete(key)
        }
      })
    } else {
      c.res.headers.set('ETag', etag)
    }
  }
}
