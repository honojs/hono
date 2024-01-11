import { generateHtmlMap, saveHtmlToLocal } from '../../../deno_dist/helper/ssg/index.ts'
import type { FileSystemModule, ToSSGInterface } from '../../../deno_dist/helper/ssg/index.ts'

export const denoFileSystemModule: FileSystemModule = {
  writeFile: async (path, data) => {
    const uint8Data = typeof data === 'string' ? new TextEncoder().encode(data) : data
    await Deno.writeFile(path, uint8Data)
  },
  mkdir: async (path, options) => {
    return Deno.mkdir(path, { recursive: options?.recursive ?? false })
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

    return { success: true, files }
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error))
    return { success: false, error: errorObj }
  }
}
