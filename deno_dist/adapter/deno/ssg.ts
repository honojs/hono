import { toSSG as baseToSSG } from '../../helper/ssg/index.ts'
import type { FileSystemModule, ToSSGAdaptorInterface } from '../../helper/ssg/index.ts'

export const denoFileSystemModule: FileSystemModule = {
  writeFile: async (path, data) => {
    const uint8Data = typeof data === 'string' ? new TextEncoder().encode(data) : data
    await Deno.writeFile(path, uint8Data)
  },
  mkdir: async (path, options) => {
    return Deno.mkdir(path, { recursive: options?.recursive ?? false })
  },
}

export const toSSG: ToSSGAdaptorInterface = async (app, options) => {
  return baseToSSG(app, denoFileSystemModule, options)
}
