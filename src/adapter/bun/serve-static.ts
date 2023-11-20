// @denoify-ignore
/* eslint-disable @typescript-eslint/ban-ts-comment */
import { existsSync } from 'fs'
import type { Context } from '../../context'
import type { Next } from '../../types'
import { getFilePath } from '../../utils/filepath'
import { getMimeType } from '../../utils/mime'

// @ts-ignore
const { file } = Bun

export type ServeStaticOptions = {
  root?: string
  path?: string
  rewriteRequestPath?: (path: string) => string
}

const DEFAULT_DOCUMENT = 'index.html'

export const serveStatic = (options: ServeStaticOptions = { root: '' }) => {
  return async (c: Context, next: Next) => {
    // Do nothing if Response is already set
    if (c.finalized) {
      await next()
      return
    }
    const url = new URL(c.req.url)

    const filename = options.path ?? decodeURI(url.pathname)
    let path = getFilePath({
      filename: options.rewriteRequestPath ? options.rewriteRequestPath(filename) : filename,
      root: options.root,
      defaultDocument: DEFAULT_DOCUMENT,
    })

    if (!path) return await next()

    path = `./${path}`

    if (existsSync(path)) {
      const content = file(path)
      if (content) {
        const mimeType = getMimeType(path)
        if (mimeType) {
          c.header('Content-Type', mimeType)
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
