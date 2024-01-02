// @denoify-ignore
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
// For ES module mode
import manifest from '__STATIC_CONTENT_MANIFEST'
import type { Env } from '../../types'
import type { ServeStaticOptions } from './serve-static'
import { serveStatic } from './serve-static'

const module = <E extends Env = Env>(options: ServeStaticOptions<E> = { root: '' }) => {
  return serveStatic<E>({
    root: options.root,
    path: options.path,
    manifest: options.manifest ? options.manifest : manifest,
    rewriteRequestPath: options.rewriteRequestPath,
  })
}

export { module as serveStatic }
