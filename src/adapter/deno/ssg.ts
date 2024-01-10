/* eslint-disable @typescript-eslint/ban-ts-comment */
import { generateHtmlMap, saveHtmlToLocal } from '../../helper/ssg'
import type { FileSystemModule, ToSsgInterface } from '../../helper/ssg'

export const denoFileSystemModule: FileSystemModule = {
  writeFile: async (path, data) => {
    const uint8Data = typeof data === 'string' ? new TextEncoder().encode(data) : data
    await Deno.writeFile(path, uint8Data)
  },
  mkdir: (path, options) => {
    const recursive = options?.recursive ?? false
    return Deno.mkdir(path, recursive)
  },
}

export const toSSG: ToSsgInterface = async (app, denoFileSystemModule, options: { dir: string }) => {
  const maps = await generateHtmlMap(app)
  await saveHtmlToLocal(maps, denoFileSystemModule, options.dir)
  console.log('Static site generation completed.')
}
