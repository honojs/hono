/**
 * @module
 * Serve Static Middleware for Hono.
 */

import type { Context, Data } from '../../context'
import type { Env, MiddlewareHandler } from '../../types'
import { getFilePath, getFilePathWithoutDefaultDocument } from '../../utils/filepath'
import { getMimeType } from '../../utils/mime'

export type ServeStaticOptions<E extends Env = Env> = {
  root?: string
  path?: string
  precompressed?: boolean
  mimes?: Record<string, string>
  rewriteRequestPath?: (path: string) => string
  onNotFound?: (path: string, c: Context<E>) => void | Promise<void>
}

const ENCODINGS = {
  br: '.br',
  zstd: '.zst',
  gzip: '.gz',
} as const

const DEFAULT_DOCUMENT = 'index.html'
const defaultPathResolve = (path: string) => path

/**
 * This middleware is not directly used by the user. Create a wrapper specifying `getContent()` by the environment such as Deno or Bun.
 */
export const serveStatic = <E extends Env = Env>(
  options: ServeStaticOptions<E> & {
    getContent: (path: string, c: Context<E>) => Promise<Data | Response | null>
    pathResolve?: (path: string) => string
    isDir?: (path: string) => boolean | undefined | Promise<boolean | undefined>
  }
): MiddlewareHandler => {
  return async (c, next) => {
    // Do nothing if Response is already set
    if (c.finalized) {
      await next()
      return
    }

    let filename = options.path ?? decodeURI(c.req.path)
    filename = options.rewriteRequestPath ? options.rewriteRequestPath(filename) : filename
    const root = options.root

    // If it was Directory, force `/` on the end.
    if (!filename.endsWith('/') && options.isDir) {
      const path = getFilePathWithoutDefaultDocument({
        filename,
        root,
      })
      if (path && (await options.isDir(path))) {
        filename += '/'
      }
    }

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
    let mimeType: string | undefined

    if (options.precompressed) {
      if (options.mimes) {
        mimeType = getMimeType(path, options.mimes) ?? getMimeType(path)
      } else {
        mimeType = getMimeType(path)
      }

      const acceptEncodings =
        c.req
          .header('Accept-Encoding')
          ?.split(',')
          .map((encoding) => encoding.trim())
          .filter((encoding): encoding is keyof typeof ENCODINGS =>
            Object.hasOwn(ENCODINGS, encoding)
          )
          .sort((a, b) => Object.keys(ENCODINGS).indexOf(a) - Object.keys(ENCODINGS).indexOf(b)) ||
        []

      for (const acceptEncoding of acceptEncodings) {
        const extension = ENCODINGS[acceptEncoding]

        if (await getContent(path + extension, c)) {
          path = pathResolve(path + extension)
          c.header('Content-Encoding', acceptEncoding)
          c.header('Vary', 'Accept-Encoding', { append: true })
          break
        }
      }
    } else {
      path = pathResolve(path)
    }

    let content = await getContent(path, c)

    if (!content) {
      let pathWithoutDefaultDocument = getFilePathWithoutDefaultDocument({
        filename,
        root,
      })
      if (!pathWithoutDefaultDocument) {
        return await next()
      }
      pathWithoutDefaultDocument = pathResolve(pathWithoutDefaultDocument)

      if (pathWithoutDefaultDocument !== path) {
        content = await getContent(pathWithoutDefaultDocument, c)
        if (content) {
          path = pathWithoutDefaultDocument
        }
      }
    }

    if (content instanceof Response) {
      return c.newResponse(content.body, content)
    }

    if (content) {
      if (!mimeType) {
        if (options.mimes) {
          mimeType = getMimeType(path, options.mimes) ?? getMimeType(path)
        } else {
          mimeType = getMimeType(path)
        }
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
