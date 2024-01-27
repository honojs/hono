import type { Context } from '../../context.ts'
import type { MiddlewareHandler } from '../../types.ts'

type BodyLimitOptions = {
  maxSize: number
  onError?: (c: Context) => Response | Promise<Response>
}

/**
 * Body Limit Middleware
 *
 * @example
 * ```ts
 * app.post(
 *  '/hello',
 *  bodyLimit({
 *    maxSize: 15 * Unit.b,
 *    onError: (c) => {
 *      return c.text('oveflow :(', 413)
 *    }
 *  }),
 *  (c) => {
 *    return c.text('pass :)')
 *  }
 * )
 * ```
 */
export const bodyLimit = (options: BodyLimitOptions): MiddlewareHandler =>
  async function bodyLimit(c, next) {
    if (!c.req.raw.body) return next()

    const maxSize = options.maxSize
    let size = 0

    const reader = c.req.raw.body.getReader()
    const chunks: Uint8Array[] = []

    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      if (value) {
        size += value.length
        if (size > maxSize) {
          if (options?.onError) {
            return options?.onError(c)
          }
          return c.text('413 Request Entity Too Large', 413)
        }
        chunks.push(value)
      }
    }

    const bodyUint8Array = chunks.reduce((acc: Uint8Array, val: Uint8Array) => {
      const temp = new Uint8Array(acc.length + val.length)
      temp.set(acc, 0)
      temp.set(val, acc.length)
      return temp
    }, new Uint8Array())

    c.req.bodyCache.arrayBuffer = bodyUint8Array

    await next()
  }

/**
 * Unit any
 * @example
 * ```ts
 * const limit = 100 * Unit.kb // 100kb
 * const limit2 = 1 * Unit.gb // 1gb
 * ```
 */
export const Unit = { b: 1, kb: 1024, mb: 1024 ** 2, gb: 1024 ** 3, tb: 1024 ** 4, pb: 1024 ** 5 }
