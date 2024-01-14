// @denoify-ignore
/* eslint-disable @typescript-eslint/ban-ts-comment */
import { mkdir, writeFile } from 'fs/promises'
import { toSSG as baseToSSG } from '../../helper/ssg'
import type { FileSystemModule, ToSSGAdaptorInterface } from '../../helper/ssg'

/**
 * @experimental
 * `bunFileSystemModule` is an experimental feature.
 * The API might be changed.
 */
export const bunFileSystemModule: FileSystemModule = {
  writeFile: (path, data) => {
    return writeFile(path, data)
  },
  mkdir: async (path, options) => {
    await mkdir(path, options)
  },
}

/**
 * @experimental
 * `toSSG` is an experimental feature.
 * The API might be changed.
 */
export const toSSG: ToSSGAdaptorInterface = async (app, options) => {
  return baseToSSG(app, bunFileSystemModule, options)
}
