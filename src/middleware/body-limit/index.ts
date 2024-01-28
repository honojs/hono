import type { Context, MiddlewareHandler } from '../..'

const bodyTypes = ['body', 'json', 'form', 'text'] as const

type bodyLimitOptions = {
  type?: typeof bodyTypes[number]
  maxSize?: number
  handler?: (c: Context) => Response
}[]

type bodyLimitOption = bodyLimitOptions[number]

type bodyLimitObject = {
  body?: bodyLimitOption
  json?: bodyLimitOption
  form?: bodyLimitOption
  text?: bodyLimitOption
}

const defaultOptions: bodyLimitOptions = bodyTypes.map((bodyType) => {
  return {
    type: bodyType,
    limit: NaN,
    handler: (c: Context) => {
      return c.text('413 Request Entity Too Large', 413)
    },
  }
})

const allowMethods = ['POST', 'PUT', 'PATCH']

const deleteSameType = (options: bodyLimitOptions): bodyLimitObject => {
  const objects: bodyLimitObject = {}

  for (let i = 0, len = options.length; i < len; i++) {
    const option = options[i]
    objects[option.type ?? 'body'] = {
      type: 'body',
      maxSize: NaN,
      handler: (c: Context) => {
        return c.text('413 Request Entity Too Large', 413)
      },
      ...option,
    }
  }

  return objects
}

/**
 * Built-in Middleware for limit body size
 *
 * @example
 * ```ts
 * app.post(
 *  '/hello',
 *  bodyLimit({
 *    type: 'text', // body | json | form | text
 *    limit: 15 * Unit.b, // byte,
 *    handler: (c) => {
 *      return c.text("oveflow :(");
 *    }
 *  }),
 *  (c) => {
 *    return c.text('pass :)')
 *  }
 * )
 *
 * /**
 * body: all type
 * text: taxt/plain
 * json: application/json
 * form: application/x-www-form-urlencoded
 * *\/
 * ```
 */
export const bodyLimit = (
  options: bodyLimitOptions | bodyLimitOption = defaultOptions
): MiddlewareHandler => {
  const limitOptions: bodyLimitObject = deleteSameType([...defaultOptions, ...[options].flat()])

  return async function bodylimit(c: Context, next: () => Promise<void>) {
    if (allowMethods.includes(c.req.method.toUpperCase())) {
      const req = c.req.raw

      const reader = req.body.getReader()
      const chunks = []

      for (;;) {
        const { done, value } = await reader.read()

        if (done) break

        chunks.push(value)
      }

      const body = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0))
      let offset = 0

      for (const chunk of chunks) {
        body.set(chunk, offset)
        offset += chunk.length
      }

      c.req.bodyCache.arrayBuffer = body

      const bodySize = body.length

      let type: typeof bodyTypes[number] = 'body'
      const ContentType = req.headers.get('Content-Type')?.trim() ?? ''

      if (ContentType.startsWith('text/plain')) {
        type = 'text'
      } else if (ContentType.startsWith('application/json')) {
        type = 'json'
      } else if (ContentType.startsWith('application/x-www-form-urlencoded')) {
        type = 'form'
      }

      const limitOption = limitOptions[type]
      const bodyLimitOption = limitOptions['body']

      if (
        limitOption &&
        limitOption.maxSize &&
        limitOption.handler &&
        !isNaN(limitOption.maxSize) &&
        bodySize > limitOption.maxSize
      ) {
        return limitOption.handler(c)
      } else if (
        bodyLimitOption &&
        bodyLimitOption.maxSize &&
        bodyLimitOption.handler &&
        !isNaN(bodyLimitOption.maxSize) &&
        bodySize > bodyLimitOption.maxSize
      ) {
        return bodyLimitOption.handler(c)
      }
    }

    await next()
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
