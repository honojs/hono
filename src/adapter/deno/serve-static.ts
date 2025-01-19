import type { ServeStaticOptions } from '../../middleware/serve-static'
import { serveStatic as baseServeStatic } from '../../middleware/serve-static'
import type { DefaultEnv, Env, MiddlewareHandler } from '../../types'

const { open, lstatSync, errors } = Deno

export const serveStatic = <E extends Env = DefaultEnv>(
  options: ServeStaticOptions<E>
): MiddlewareHandler<E> => {
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

    return baseServeStatic<E>({
      ...options,
      getContent,
      pathResolve,
      isDir,
    })(c, next)
  }
}
