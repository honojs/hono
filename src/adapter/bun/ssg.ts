// @denoify-ignore
/* eslint-disable @typescript-eslint/ban-ts-comment */
import { mkdir, writeFile } from 'fs/promises'
import { generateHtmlMap, saveHtmlToLocal } from '../../helper/ssg'
import type { FileSystemModule, ToSsgInterface } from '../../helper/ssg'

export const bunFileSystemModule: FileSystemModule = {
  writeFile: (path, data) => {
    return writeFile(path, data)
  },
  mkdir: async (path, options) => {
    await mkdir(path, options)
  },
}

export const ToSsg: ToSsgInterface = async (app, bunFileSystemModule, options: { dir: string }) => {
  const maps = await generateHtmlMap(app)
  await saveHtmlToLocal(maps, bunFileSystemModule, options.dir)
  console.log('Static site generation completed.')
}
