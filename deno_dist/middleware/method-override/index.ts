import { URLSearchParams } from 'node:url'
import type { Context } from '../../context.ts'
import type { Hono } from '../../hono.ts'
import type { MiddlewareHandler } from '../../types.ts'
import { parseBody } from '../../utils/body.ts'

type MethodOverrideOptions = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  app: Hono<any, any, any>
} & (
  | {
      // Default is 'form' and the value is `_method`
      form?: string
      header?: never
      query?: never
    }
  | {
      form?: never
      header: string
      query?: never
    }
  | {
      form?: never
      header?: never
      query: string
    }
)

const DEFAULT_METHOD_FORM_NAME = '_method'

/**
 * Method Override Middleware
 *
 * @example
 * // with form input method
 * const app = new Hono()
 * app.use('/books/*', methodOverride({ app })) // the default `form` value is `_method`
 * app.use('/authors/*', methodOverride({ app, form: 'method' }))
 *
 * @example
 * // with custom header
 * app.use('/books/*', methodOverride({ app, header: 'X-HTTP-METHOD-OVERRIDE' }))
 *
 * @example
 * // with query parameter
 * app.use('/books/*', methodOverride({ app, query: '_method' }))
 */
export const methodOverride = (options: MethodOverrideOptions): MiddlewareHandler =>
  async function methodOverride(c, next) {
    if (c.req.method === 'GET') {
      return await next()
    }

    const app = options.app
    // Method override by form
    if (!(options.header || options.query)) {
      const contentType = c.req.header('content-type')
      const methodFormName = options.form || DEFAULT_METHOD_FORM_NAME
      const clonedRequest = c.req.raw.clone()
      const newRequest = clonedRequest.clone()
      // Content-Type is `multipart/form-data`
      if (contentType?.startsWith('multipart/form-data')) {
        const form = await clonedRequest.formData()
        const method = form.get(methodFormName)
        if (method) {
          const newForm = await newRequest.formData()
          newForm.delete(methodFormName)
          const newHeaders = new Headers(clonedRequest.headers)
          newHeaders.delete('content-type')
          newHeaders.delete('content-length')
          const request = new Request(c.req.url, {
            body: newForm,
            headers: newHeaders,
            method: method as string,
          })
          return app.fetch(request, c.env, getExecutionCtx(c))
        }
      }
      // Content-Type is `application/x-www-form-urlencoded`
      if (contentType === 'application/x-www-form-urlencoded') {
        const params = await parseBody<Record<string, string>>(clonedRequest)
        const method = params[methodFormName]
        if (method) {
          delete params[methodFormName]
          const newParams = new URLSearchParams(params)
          const request = new Request(newRequest, {
            body: newParams,
            method: method as string,
          })
          return app.fetch(request, c.env, getExecutionCtx(c))
        }
      }
    }
    // Method override by header
    else if (options.header) {
      const headerName = options.header
      const method = c.req.header(headerName)
      if (method) {
        const newHeaders = new Headers(c.req.raw.headers)
        newHeaders.delete(headerName)
        const request = new Request(c.req.raw, {
          headers: newHeaders,
          method,
        })
        return app.fetch(request, c.env, getExecutionCtx(c))
      }
    }
    // Method override by query
    else if (options.query) {
      const queryName = options.query
      const method = c.req.query(queryName)
      if (method) {
        const url = new URL(c.req.url)
        url.searchParams.delete(queryName)
        const request = new Request(url.toString(), {
          body: c.req.raw.body,
          headers: c.req.raw.headers,
          method,
        })
        return app.fetch(request, c.env, getExecutionCtx(c))
      }
    }
    await next()
  }

const getExecutionCtx = (c: Context) => {
  let executionCtx: ExecutionContext | undefined
  try {
    executionCtx = c.executionCtx
  } catch {
    // Do nothing
  }
  return executionCtx
}
