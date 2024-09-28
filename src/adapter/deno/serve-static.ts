import type { ServeStaticOptions } from '../../middleware/serve-static'
import { serveStatic as baseServeStatic } from '../../middleware/serve-static'
import type { Env, MiddlewareHandler } from '../../types'

const { open, lstatSync, seekSync, readSync, SeekMode } = Deno

export const serveStatic = <E extends Env = Env>(
  options: ServeStaticOptions<E>
): MiddlewareHandler => {
  return async function serveStatic(c, next) {
    const getContent = async (path: string) => {
      try {
        const file = await open(path)
        return file?.readable ?? null
      } catch (e) {
        console.warn(`${e}`)
        return null
      }
    }
    const pathResolve = (path: string) => {
      return path.startsWith('/') ? path : `./${path}`
    }
    const isDir = (path: string) => {
      let isDir
      try {
        const stat = lstatSync(path)
        isDir = stat.isDirectory
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
        const size = lstatSync(path).size
        return {
          size,
          getPartialContent: function getPartialContent(start: number, end: number) {
            seekSync(handle.rid, start, SeekMode.Start)
            const data = new Uint8Array(end - start + 1)
            readSync(handle.rid, data)
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
