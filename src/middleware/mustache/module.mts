// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
// For ES module mode
import manifest from '__STATIC_CONTENT_MANIFEST'
import type { MustacheOptions } from './mustache'
import { mustache } from './mustache'

const module = (options: MustacheOptions = { root: '' }) => {
  return mustache({
    root: options.root,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    manifest: options.manifest ? options.manifest : manifest,
  })
}

export { module as mustache }
