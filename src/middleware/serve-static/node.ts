// @denoify-ignore
/* eslint-disable @typescript-eslint/ban-ts-comment */
import { existsSync, readFileSync } from 'fs'
import type { MiddlewareHandler } from '../../hono'
import { getFilePath } from '../../utils/filepath'
import { getMimeType } from '../../utils/mime'

export type ServeStaticOptions = {
  root?: string
  path?: string
  index?: string
}

export const serveStatic = (options: ServeStaticOptions = { root: '' }): MiddlewareHandler => {
  return async (c, next): Promise<Response | undefined> => {
    // Do nothing if Response is already set
    if (c.res && c.finalized) {
      await next()
    }
    const url = new URL(c.req.url)

    let path = getFilePath({
      filename: options.path ?? url.pathname,
      root: options.root,
      defaultDocument: options.index ?? 'index.html',
    })
    path = `./${path}`

    if (existsSync(path)) {
      const content = readFileSync(path)
      if (content) {
        const mimeType = getMimeType(path)
        if (mimeType) {
          c.res.headers.set('Content-Type', mimeType)
        }
        // Return Response object
        return c.body(content)
      }
    }

    console.warn(`Static file: ${path} is not found`)
    await next()
    return
  }
}
