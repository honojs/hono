// @denoify-ignore
/* eslint-disable @typescript-eslint/ban-ts-comment */
import { toSSG as baseToSSG } from '../../helper/ssg'
import type { FileSystemModule, ToSSGAdaptorInterface } from '../../helper/ssg'

// @ts-ignore
const { write } = Bun

/**
 * @experimental
 * `bunFileSystemModule` is an experimental feature.
 * The API might be changed.
 */
export const bunFileSystemModule: FileSystemModule = {
  writeFile: async (path, data) => {
    await write(path, data)
  },
  mkdir: async () => {},
}

/**
 * @experimental
 * `toSSG` is an experimental feature.
 * The API might be changed.
 */
export const toSSG: ToSSGAdaptorInterface = async (app, options) => {
  return baseToSSG(app, bunFileSystemModule, options)
}
