/* eslint-disable @typescript-eslint/ban-ts-comment */
import { stat } from 'node:fs/promises'
import { join } from 'node:path'
import { serveStatic as baseServeStatic } from '../../middleware/serve-static'
import type { ServeStaticOptions } from '../../middleware/serve-static'
import type { Env, MiddlewareHandler } from '../../types'

export const serveStatic = <E extends Env = Env>(
  options: ServeStaticOptions<E>
): MiddlewareHandler => {
  return async function serveStatic(c, next) {
    const getContent = async (path: string) => {
      // @ts-ignore
      const file = Bun.file(path)
      return (await file.exists()) ? file : null
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
      join,
      isDir,
    })(c, next)
  }
}
