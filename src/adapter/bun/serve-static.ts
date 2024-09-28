/* eslint-disable @typescript-eslint/ban-ts-comment */
import { open, stat } from 'node:fs/promises'
import { serveStatic as baseServeStatic } from '../../middleware/serve-static'
import type { ServeStaticOptions } from '../../middleware/serve-static'
import type { Env, MiddlewareHandler } from '../../types'

export const serveStatic = <E extends Env = Env>(
  options: ServeStaticOptions<E>
): MiddlewareHandler => {
  return async function serveStatic(c, next) {
    const getContent = async (path: string) => {
      path = path.startsWith('/') ? path : `./${path}`
      // @ts-ignore
      const file = Bun.file(path)
      return (await file.exists()) ? file : null
    }
    const pathResolve = (path: string) => {
      return path.startsWith('/') ? path : `./${path}`
    }
    const isDir = async (path: string) => {
      let isDir
      try {
        const stats = await stat(path)
        isDir = stats.isDirectory()
      } catch {}
      return isDir
    }
    return baseServeStatic({
      ...options,
      getContent,
      pathResolve,
      isDir,
      partialContentSupport: async (path: string) => {
        path = path.startsWith('/') ? path : `./${path}`
        const handle = await open(path)
        const size = (await handle.stat()).size
        return {
          size,
          getPartialContent: function getPartialContent(start: number, end: number) {
            const readStream = handle.createReadStream({ start, end })
            const data = new ReadableStream({
              start(controller) {
                readStream.on('data', (chunk) => {
                  controller.enqueue(chunk)
                })
                readStream.on('end', () => {
                  controller.close()
                })
                readStream.on('error', (e) => {
                  controller.error(e)
                })
              },
            })
            return {
              start,
              end,
              data,
            }
          },
          close: () => {
            handle.close()
          },
        }
      },
    })(c, next)
  }
}
