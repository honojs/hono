import type { ServeStaticOptions } from '../../middleware/serve-static'
import { serveStatic as baseServeStatic } from '../../middleware/serve-static'
import type { Env, MiddlewareHandler } from '../../types'

const { open, lstatSync, errors } = Deno

export const serveStatic = <E extends Env = Env>(
  options: ServeStaticOptions<E>
): MiddlewareHandler => {
  return async function serveStatic(c, next) {
    const getContent = async (path: string) => {
      try {
        if (isDir(path)) {
          return null
        }

        const file = await open(path)
        return file.readable
      } catch (e) {
        if (!(e instanceof errors.NotFound)) {
          console.warn(`${e}`)
        }
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
    })(c, next)
  }
}
