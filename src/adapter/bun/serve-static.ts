// @denoify-ignore
/* eslint-disable @typescript-eslint/ban-ts-comment */
import { serveStatic as baseServeStatic } from '../../middleware/serve-static'
import type { ServeStaticOptions } from '../../middleware/serve-static'
import type { Env, MiddlewareHandler } from '../../types'

export const serveStatic = <E extends Env = Env>(
  options: ServeStaticOptions<E>
): MiddlewareHandler => {
  return async function serveStatic(c, next) {
    const getContent = async (path: string) => {
      path = `./${path}`
      // @ts-ignore
      const file = Bun.file(path)
      return (await file.exists()) ? file : null
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
