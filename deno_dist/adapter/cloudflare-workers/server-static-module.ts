import type { ServeStaticOptions } from './serve-static.ts'
import { serveStatic } from './serve-static.ts'

const module = (options: ServeStaticOptions) => {
  return serveStatic({
    root: options.root,
    path: options.path,
    manifest: options.manifest,
    rewriteRequestPath: options.rewriteRequestPath,
  })
}

export { module as serveStatic }
