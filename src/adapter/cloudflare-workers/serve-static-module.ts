// For ES module mode
import type { DefaultEnv, Env, MiddlewareHandler } from '../../types'
import type { ServeStaticOptions } from './serve-static'
import { serveStatic } from './serve-static'

const module = <E extends Env = DefaultEnv>(
  options: Omit<ServeStaticOptions<E>, 'namespace'>
): MiddlewareHandler<E> => {
  return serveStatic<E>(options)
}

export { module as serveStatic }
