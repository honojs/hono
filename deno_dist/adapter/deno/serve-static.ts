import type { Context } from '../../context.ts'
import type { Env, MiddlewareHandler } from '../../types.ts'
import { getFilePath } from '../../utils/filepath.ts'
import { getMimeType } from '../../utils/mime.ts'

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const { open } = Deno

export type ServeStaticOptions<E extends Env = Env> = {
  root?: string
  path?: string
  rewriteRequestPath?: (path: string) => string
  onNotFound?: (path: string, c: Context<E>) => void | Promise<void>
}

const DEFAULT_DOCUMENT = 'index.html'

export const serveStatic = <E extends Env = Env>(
  options: ServeStaticOptions<E> = { root: '' }
): MiddlewareHandler => {
  return async (c, next) => {
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

    let file

    try {
      file = await open(path)
    } catch (e) {
      console.warn(`${e}`)
    }

    if (file) {
      const mimeType = getMimeType(path)
      if (mimeType) {
        c.header('Content-Type', mimeType)
      }
      // Return Response object with stream
      return c.body(file.readable)
    }

    await options.onNotFound?.(path, c)
    await next()
    return
  }
}
