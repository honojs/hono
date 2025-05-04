/**
 * A middleware for setting HTML head elements
 * @module
 */

import type { Context } from '../../context'
import type { MiddlewareHandler, Next } from '../../types'

const HEAD_OPENING_REGEX = /<head[^>]*>/i

/**
 * A middleware for setting HTML head elements
 * @param head - a string or a function that returns a string or a promise of a string
 * @returns a middleware handler that sets the HTML head elements
 *
 * @example
 * ```ts
 * import { htmlHead } from 'hono/middleware/html-head'
 *
 * app.use('*', htmlHead('<link rel="stylesheet" href="/style.css">'))
 * app.get('/', (c) => c.html(html`<html><head></head><body>Hello World!</body></html>`))
 * ```
 */
export const htmlHead = (
  head: string | ((c: Context, html: string) => string | Promise<string>)
): MiddlewareHandler => {
  return async function htmlHeadMiddleware(c: Context, next: Next) {
    await next()
    const contentType = c.res.headers.get('Content-Type')
    if (!contentType?.startsWith('text/html')) {
      return
    }
    if (typeof head === 'function') {
      const html = await c.res.text()
      const generatedHead = await head(c, html)
      let replaced = false
      const newHtml = html.replace(HEAD_OPENING_REGEX, (cur) => {
        replaced = true
        return `${cur}${generatedHead}`
      })
      c.res = c.body(replaced ? newHtml : `<head>${generatedHead}</head>${html}`)
    } else {
      if (!c.res.body) {
        return
      }
      let cur = ''
      let injected = false
      const stream = c.res.body
        .pipeThrough(new TextDecoderStream())
        .pipeThrough(
          new TransformStream<string, string>({
            transform(chunk, controller) {
              if (injected) {
                controller.enqueue(chunk)
                return
              }
              cur += chunk
              const matchedHead = cur.match(HEAD_OPENING_REGEX)
              if (matchedHead && matchedHead.index !== undefined) {
                controller.enqueue(
                  `${cur.slice(0, matchedHead.index + matchedHead[0].length)}${head}${cur.slice(
                    matchedHead.index + matchedHead[0].length
                  )}`
                )
                injected = true
                cur = ''
              }
            },
            flush(controller) {
              // head tag not found, enqueue the rest of the data
              if (cur) {
                controller.enqueue(`<head>${head}</head>`)
                controller.enqueue(cur)
              }
            },
          })
        )
        .pipeThrough(new TextEncoderStream())
      c.res = c.body(stream)
    }
  }
}
