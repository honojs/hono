import type { Context } from '../../context.ts'
import { HTTPException } from '../../http-exception.ts'
import type { MiddlewareHandler } from '../../types.ts'

const ERROR_MESSAGE = 'Payload Too Large'

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
 *    maxSize: 100 * 1024, // 100kb
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
  const onError: OnError =
    options.onError ||
    (() => {
      const res = new Response(ERROR_MESSAGE, {
        status: 413,
      })
      throw new HTTPException(413, { res })
    })
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
              controller.error(new BodyLimitError(ERROR_MESSAGE))
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
