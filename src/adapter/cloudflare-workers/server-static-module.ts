// @denoify-ignore
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
// For ES module mode
import manifest from '__STATIC_CONTENT_MANIFEST'
import type { ServeStaticOptions } from './serve-static'
import { serveStatic } from './serve-static'

const module = (options: ServeStaticOptions = { root: '' }) => {
  return serveStatic({
    root: options.root,
    path: options.path,
    manifest: options.manifest ? options.manifest : manifest,
    rewriteRequestPath: options.rewriteRequestPath,
  })
}

export { module as serveStatic }
