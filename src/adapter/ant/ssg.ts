import { mkdir, writeFile } from 'node:fs/promises'
import { toSSG as baseToSSG } from '../../helper/ssg'
import type { FileSystemModule, ToSSGAdaptorInterface } from '../../helper/ssg'

/**
 * @experimental
 * `antFileSystemModule` is an experimental feature.
 * The API might be changed.
 */
export const antFileSystemModule: FileSystemModule = {
  writeFile: async (path, data) => {
    await writeFile(path, data)
  },
  mkdir: async (path, options) => {
    await mkdir(path, { recursive: options?.recursive ?? false })
  },
}

/**
 * @experimental
 * `toSSG` is an experimental feature.
 * The API might be changed.
 */
export const toSSG: ToSSGAdaptorInterface = async (app, options) => {
  return baseToSSG(app, antFileSystemModule, options)
}
