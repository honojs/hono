import type { Context, MiddlewareHandler } from '../..'

const bodyTypes = ['body', 'json', 'form', 'text'] as const

type bodyLimitOptions = {
  type?: typeof bodyTypes[number]
  limit?: number
  handler?: (c: Context) => Response
}[]

type bodyLimitObject = {
  body?: bodyLimitOptions[number]
  json?: bodyLimitOptions[number]
  form?: bodyLimitOptions[number]
  text?: bodyLimitOptions[number]
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
      limit: NaN,
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
 *    limit: 15 * Uint.b, // byte,
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
  options: bodyLimitOptions | bodyLimitOptions[number] = defaultOptions
): MiddlewareHandler => {
  const limitOptions: bodyLimitObject = deleteSameType([...defaultOptions, ...[options].flat()])

  return async function bodylimit(c: Context, next: () => Promise<void>) {
    if (allowMethods.includes(c.req.method.toUpperCase())) {
      const req = c.req.raw.clone()
      const blob = await req.blob()
      const bodySize = blob.size

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
        limitOption.limit &&
        limitOption.handler &&
        !isNaN(limitOption.limit) &&
        bodySize > limitOption.limit
      ) {
        return limitOption.handler(c)
      } else if (
        bodyLimitOption &&
        bodyLimitOption.limit &&
        bodyLimitOption.handler &&
        !isNaN(bodyLimitOption.limit) &&
        bodySize > bodyLimitOption.limit
      ) {
        return bodyLimitOption.handler(c)
      }
    }

    await next()
  }
}

/**
 * Uint any
 * @example
 * ```ts
 * const limit = 100 * Uint.kb // 100kb
 * const limit2 = 1 * Unit.gb // 1gb
 * ```
 */
export const Uint = { b: 1, kb: 1000, mb: 1000 ** 2, gb: 1000 ** 3, tb: 1000 ** 4, pb: 1000 ** 5 }
