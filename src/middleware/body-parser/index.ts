import type { Context, MiddlewareHandler } from '../..'

type bodyParserOptions = {
  type?: 'body' | 'json' | 'form' | 'text'
  limit?: number
  handler?: (c: Context) => Response
  onError?: (c: Context) => Response
}

const defaultOptions: bodyParserOptions = {
  type: 'body',
  limit: 2147483647,
  handler: (c: Context) => {
    return c.text('413 Request Entity Too Large', 413)
  },
  onError: (c: Context) => {
    return c.text('Internal Server Error', 500)
  },
}

const allowMethods = ['POST', 'PUT', 'PATCH']

export const bodyParser = (
  options: bodyParserOptions = defaultOptions
): MiddlewareHandler<{
  Variables: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    body: <T = any>() => T
  }
}> => {
  const parseOptions: bodyParserOptions = {
    ...defaultOptions,
    ...options,
  }

  return async function bodyParse(c: Context, next: () => Promise<void>) {
    if (
      allowMethods.includes(c.req.method.toUpperCase()) &&
      parseOptions.handler &&
      parseOptions.limit &&
      parseOptions.type
    ) {
      const req = c.req.raw.clone()
      const blob = await req.blob()
      const bodySize = blob.size

      if (bodySize >= parseOptions.limit) {
        c.res = parseOptions.handler(c)
        c.finalized = true
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let parsedData: any = blob

      switch (parseOptions.type) {
        case 'body':
          parsedData = blob
          break
        case 'text':
          parsedData = await blob.text()
          break
        case 'json':
          parsedData = JSON.parse(await blob.text())
          break
        case 'form':
          parsedData = await c.req.formData()
          break
        default:
          parsedData = await blob.text()
          break
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      c.set('body', <T = any>() => parsedData as T)
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
