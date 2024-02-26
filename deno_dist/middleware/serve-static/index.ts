import type { Context } from '../../context.ts'
import type { Env, MiddlewareHandler } from '../../types.ts'
import { getFilePath, getFilePathWithoutDefaultDocument } from '../../utils/filepath.ts'
import { getMimeType } from '../../utils/mime.ts'

export type ServeStaticOptions<E extends Env = Env> = {
  root?: string
  path?: string
  mimes?: Record<string, string>
  rewriteRequestPath?: (path: string) => string
  onNotFound?: (path: string, c: Context<E>) => void | Promise<void>
}

const DEFAULT_DOCUMENT = 'index.html'
const defaultPathResolve = (path: string) => path

/**
 * This middleware is not directly used by the user. Create a wrapper specifying `getContent()` by the environment such as Deno or Bun.
 */
export const serveStatic = <E extends Env = Env>(
  options: ServeStaticOptions<E> & {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getContent: (path: string) => any
    pathResolve?: (path: string) => string
  }
): MiddlewareHandler => {
  return async (c, next) => {
    // Do nothing if Response is already set
    if (c.finalized) {
      await next()
      return
    }
    const url = new URL(c.req.url)

    let filename = options.path ?? decodeURI(url.pathname)
    filename = options.rewriteRequestPath ? options.rewriteRequestPath(filename) : filename
    const root = options.root

    let path = getFilePath({
      filename,
      root,
      defaultDocument: DEFAULT_DOCUMENT,
    })

    if (!path) {
      return await next()
    }

    const getContent = options.getContent
    const pathResolve = options.pathResolve ?? defaultPathResolve

    path = pathResolve(path)
    let content = await getContent(path)

    if (!content) {
      let pathWithOutDefaultDocument = getFilePathWithoutDefaultDocument({
        filename,
        root,
      })
      if (!pathWithOutDefaultDocument) {
        return await next()
      }
      pathWithOutDefaultDocument = pathResolve(pathWithOutDefaultDocument)
      content = await getContent(pathWithOutDefaultDocument)
      if (content) {
        path = pathWithOutDefaultDocument
      }
    }

    if (content) {
      let mimeType: string | undefined = undefined
      if (options.mimes) {
        mimeType = getMimeType(path, options.mimes) ?? getMimeType(path)
      } else {
        mimeType = getMimeType(path)
      }
      if (mimeType) {
        c.header('Content-Type', mimeType)
      }
      return c.body(content)
    }

    await options.onNotFound?.(path, c)
    await next()
    return
  }
}
