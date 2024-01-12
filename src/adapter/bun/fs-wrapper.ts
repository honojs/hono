/* eslint-disable @typescript-eslint/ban-ts-comment */
import * as fs from 'node:fs/promises'
import type { FileSystemWrapper, FsObj, OpenOptions } from '../../filesystem-wrapper'

const {
  file,
  write
  // @ts-ignore
} = Bun
export const fsWrapper = (): FileSystemWrapper => {
  return {
    async open <OpenOptionsType extends OpenOptions> (path: URL | string, options?: OpenOptionsType) {
      const stat = await fs.stat(path)

      const baseStat = {
        isDirectory: stat.isDirectory(),
        isFile: stat.isFile(),
        isSymlink: stat.isSymbolicLink(),
        size: stat.size
      }
      if (baseStat.isDirectory) {
      } else {
        let readable: ReadableStream<Uint8Array> | undefined
        if (options?.read === undefined || options.read === true) {
          readable = await file(path).stream
        }
        let writable: WritableStream<Uint8Array> | undefined
        if (options?.write) {
          const transformStream = new TransformStream()
          writable = transformStream.writable
          write(path, new Response(transformStream.readable))
        }
        return {
          async close () {
            await readable?.cancel()
            await writable?.close()
          },
          async stat () {
            return {
              ...baseStat,
            }
          },
          readable,
          writable
        } as FsObj<OpenOptionsType>
      }
    }
  }
}