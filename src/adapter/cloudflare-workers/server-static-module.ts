import type { ServeStaticOptions } from './serve-static'
import { serveStatic } from './serve-static'

const module = (options: ServeStaticOptions) => {
  return serveStatic({
    root: options.root,
    path: options.path,
    manifest: options.manifest,
    rewriteRequestPath: options.rewriteRequestPath,
  })
}

export { module as serveStatic }
