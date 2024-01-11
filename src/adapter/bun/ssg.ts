// @denoify-ignore
/* eslint-disable @typescript-eslint/ban-ts-comment */
import { mkdir, writeFile } from 'fs/promises'
import { generateHtmlMap, saveHtmlToLocal } from '../../helper/ssg'
import type { FileSystemModule, ToSSGInterface } from '../../helper/ssg'

export const bunFileSystemModule: FileSystemModule = {
  writeFile: (path, data) => {
    return writeFile(path, data)
  },
  mkdir: async (path, options) => {
    await mkdir(path, options)
  },
}

export const toSSG: ToSSGInterface = async (app, bunFileSystemModule, options: { dir: string }) => {
  try {
    const maps = await generateHtmlMap(app)
    const files = await saveHtmlToLocal(maps, bunFileSystemModule, options.dir)

    console.log('Static site generation completed.')
    return { success: true, files }
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error))
    return { success: false, error: errorObj }
  }
}
