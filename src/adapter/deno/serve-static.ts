import type { ServeStaticOptions } from '../../middleware/serve-static'
import { serveStatic as baseServeStatic } from '../../middleware/serve-static'
import type { Env, MiddlewareHandler } from '../../types'

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const { open } = Deno

export const serveStatic = <E extends Env = Env>(
  options: ServeStaticOptions<E>
): MiddlewareHandler => {
  return async function serveStatic(c, next) {
    const getContent = async (path: string) => {
      try {
        const file = await open(path)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return file ? (file.readable as any) : null
      } catch (e) {
        console.warn(`${e}`)
      }
    }
    const pathResolve = (path: string) => {
      return `./${path}`
    }
    return baseServeStatic({
      ...options,
      getContent,
      pathResolve,
    })(c, next)
  }
}
