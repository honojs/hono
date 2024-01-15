// @denoify-ignore
// For ES module mode
import type { Env } from '../../types'
import type { ServeStaticOptions } from './serve-static'
import { serveStatic } from './serve-static'

const module = <E extends Env = Env>(options: Omit<ServeStaticOptions<E>, 'namespace'>) => {
  return serveStatic<E>(options)
}

export { module as serveStatic }
