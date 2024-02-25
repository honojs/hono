import type { Context } from '../../context'
import type { MiddlewareHandler } from '../../types'

type OnError = (c: Context) => Response | Promise<Response>
type BodyLimitOptions = {
  maxSize: number
  onError?: OnError
}

class BodyLimitError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BodyLimitError'
  }
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
 *      return c.text('overflow :(', 413)
 *    }
 *  }),
 *  (c) => {
 *    return c.text('pass :)')
 *  }
 * )
 * ```
 */
export const bodyLimit = (options: BodyLimitOptions): MiddlewareHandler => {
  const onError: OnError = options.onError || ((c) => c.text('413 Request Entity Too Large', 413))
  const maxSize = options.maxSize

  return async function bodyLimit(c, next) {
    if (!c.req.raw.body) {
      // maybe GET or HEAD request
      return next()
    }

    if (c.req.raw.headers.has('content-length')) {
      // we can trust content-length header because it's already validated by server
      const contentLength = parseInt(c.req.raw.headers.get('content-length') || '0', 10)
      return contentLength > maxSize ? onError(c) : next()
    }

    // maybe chunked transfer encoding

    let size = 0
    const rawReader = c.req.raw.body.getReader()
    const reader = new ReadableStream({
      async start(controller) {
        try {
          for (;;) {
            const { done, value } = await rawReader.read()
            if (done) {
              break
            }
            size += value.length
            if (size > maxSize) {
              controller.error(new BodyLimitError('413 Request Entity Too Large'))
              break
            }

            controller.enqueue(value)
          }
        } finally {
          controller.close()
        }
      },
    })

    c.req.raw = new Request(c.req.raw, { body: reader })

    await next()

    if (c.error instanceof BodyLimitError) {
      c.res = await onError(c)
    }
  }
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
