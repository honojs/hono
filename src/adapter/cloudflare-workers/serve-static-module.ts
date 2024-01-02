// @denoify-ignore
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
// For ES module mode
import manifest from '__STATIC_CONTENT_MANIFEST'
import type { Env } from '../../types'
import type { ServeStaticOptions } from './serve-static'
import { serveStatic } from './serve-static'

const module = <E extends Env = Env>(
  options: Omit<ServeStaticOptions<E>, 'namespace'> = { root: '' }
) => {
  options.manifest ??= manifest
  return serveStatic<E>(options)
}

export { module as serveStatic }
