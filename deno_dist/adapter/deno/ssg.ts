import { generateHtmlMap, saveHtmlToLocal } from '../../../deno_dist/helper/ssg/index.ts/index.ts'
import type { FileSystemModule, ToSSGInterface } from '../../../deno_dist/helper/ssg/index.ts/index.ts'

export const denoFileSystemModule: FileSystemModule = {
  writeFile: async (path, data) => {
    const uint8Data = typeof data === 'string' ? new TextEncoder().encode(data) : data
    await Deno.writeFile(path, uint8Data)
  },
  mkdir: async (path, options) => {
    const mkdirOptions: Deno.MkdirOptions = {
      recursive: options?.recursive ?? false,
    }
    return Deno.mkdir(path, mkdirOptions)
  },
}

export const toSSG: ToSSGInterface = async (
  app,
  denoFileSystemModule,
  options: { dir: string }
) => {
  try {
    const maps = await generateHtmlMap(app)
    const files = await saveHtmlToLocal(maps, denoFileSystemModule, options.dir)

    console.log('Static site generation completed.')
    return { success: true, files }
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error))
    return { success: false, error: errorObj }
  }
}
