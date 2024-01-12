/* eslint-disable @typescript-eslint/ban-ts-comment */
import type { FileSystemWrapper, FsObj, OpenOptions } from '../../filesystem-wrapper'

const {
  open,
  mkdir,
  remove,
  symlink,
  readDir,
  rename,
  watchFs
  // @ts-ignore
} = Deno
export const fsWrapper = (): FileSystemWrapper => {
  return {
    async open <OpenOptionsType extends OpenOptions> (path: URL | string, options?: OpenOptionsType) {
      const denoOpenedFile = await open(path, {
        create: options?.create
      })
      const safedOptions: OpenOptions = options ?? {}
      let readable: ReadableStream<Uint8Array> | undefined = undefined
      if (safedOptions.read === true || safedOptions.read === undefined) {
        readable = denoOpenedFile.readable
      }
      let writable: ReadableStream<Uint8Array> | undefined = undefined
      if (safedOptions.write) {
        writable = denoOpenedFile.writable
      }
      return {
        async stat () {
          const info = await denoOpenedFile.stat()
          return {
            isDirectory: info.isDirectory,
            isFile: info.isFile,
            isSymlink: info.isSymlink,
            size: info.size
          }
        },
        async close () {
          denoOpenedFile.close()
        },
        readable,
        writable
      } as unknown as FsObj<OpenOptionsType>
    },
    async mkdir (path) {
      await mkdir(path)
    },
    async remove(path) {
      await remove(path)
    },
    async symlink(oldpath, newpath, type) {
      await symlink(oldpath, newpath, {
        type
      })
    },
    async * readDir (path) {
      for await (const entry of readDir(path)) {
        yield entry
      }
    },
    async rename (oldpath, newpath) {
      await rename(oldpath, newpath)
    },
    watch (paths, options) {
      const watcher = watchFs(paths, options)
      return {
        async close () {
          watcher.close()
        },
        [Symbol.asyncIterator]: async function * () {
          for await (const event of watcher) {
            yield {
              kind: event.kind,
              paths: event.paths
            }
          }
        },
      }
    }
  }
}
