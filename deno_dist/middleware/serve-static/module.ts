// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
// For ES module mode
import manifest from '__STATIC_CONTENT_MANIFEST DENOIFY: UNKNOWN NODE BUILTIN'
import type { ServeStaticOptions } from './serve-static.ts'
import { serveStatic } from './serve-static.ts'

const module = (options: ServeStaticOptions = { root: '' }) => {
  return serveStatic({
    root: options.root,
    path: options.path,
    manifest: options.manifest ? options.manifest : manifest,
  })
}

export { module as serveStatic }
