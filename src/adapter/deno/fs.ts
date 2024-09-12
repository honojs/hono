/**
 * FS Adapter for Deno.
 * @module
 */

import { basename, isWriteParams } from '../../helper/fs/utils'
import type { ExtendedFileSystemDirectoryHandle, ExtendedFileSystemFileHandle, ExtendedFileSystemHandle, OpenDir, OpenFile } from '../../helper/fs'
import { joinPaths } from '../../utils/filepath/join'
import { relative } from '../../utils/filepath/relative'

export const resolve = (path: string) => {
  const cwd = Deno.cwd()

  return joinPaths(cwd, path)
}

const chunkTypeToUint8Array = async (chunk?: Exclude<FileSystemWriteChunkType, WriteParams>) => {
  if (!chunk) {
    return
  }
  if (typeof chunk === 'string') {
    return new TextEncoder().encode(chunk)
  }
  if (chunk instanceof Blob) {
    return new Uint8Array(await chunk.arrayBuffer())
  }
  if (chunk instanceof ArrayBuffer) {
    return new Uint8Array(chunk)
  }
  return new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength)
}

class DenoFileSystemWritableFileStream extends WritableStream<FileSystemWriteChunkType> implements FileSystemWritableFileStream {
  #file: Deno.FsFile
  constructor(file: Deno.FsFile) {
    super({
      write: async (chunk) => {
        this.#writeToDeno(chunk)
      }
    })
    this.#file = file
  }
  async seek(position: number): Promise<void> {
    await this.#file.seek(position)
  }
  async truncate(size: number): Promise<void> {
    await this.#file.truncate(size)
  }
  async write(data: FileSystemWriteChunkType): Promise<void> {
    this.#writeToDeno(data)
  }
  async #writeToDeno(inputData: FileSystemWriteChunkType) {
    if (isWriteParams(inputData)) {
      switch (inputData.type) {
        case 'write': {
          const data = await chunkTypeToUint8Array(inputData.data ?? void 0)
          inputData.position && await this.seek(inputData.position)

          data && await this.#file.write(data)
          break
        }
        case 'seek': {
          inputData.position && await this.seek(inputData.position)
        }
        case 'truncate': {
          inputData.size && await this.truncate(inputData.size)
        }
      }
    } else {

    }
  }
}

class DenoFileSystemFileHandle implements ExtendedFileSystemFileHandle {
  readonly name: string
  readonly path: string
  readonly kind = 'file'
  constructor(resolvedPath: string) {
    this.name = basename(resolvedPath)
    this.path = resolvedPath
  }
  async isSameEntry(other: ExtendedFileSystemHandle) {
    return other.kind === 'file' && this.path === other.path
  }
  remove(options: FileSystemRemoveOptions): Promise<void> {
    return Deno.remove(this.path, options)
  }
  async createWritable(options?: FileSystemCreateWritableOptions): Promise<FileSystemWritableFileStream> {
    const file = await Deno.open(this.path, {
      write: true,
      truncate: !options?.keepExistingData
    })
    return 
  }
}

export const openFile: OpenFile = async (filePath, options) => {
  let stat: Deno.FileInfo | null = null
  try {
    stat = await Deno.stat(filePath)
  } catch (_e) {
    if (options?.create) {
      await Deno.writeFile(filePath, new Uint8Array(0))
    } else {
      throw new DOMException('File is not found.', 'NotFoundError')
    }
  }
  if (stat && !stat.isDirectory) {
    throw new DOMException('Target type is not a file.', 'TypeMismatchError')
  }

  return new DenoFileSystemFileHandle(filePath)
}

class DenoFileSystemDirectoryHandle implements ExtendedFileSystemDirectoryHandle {
  readonly name: string
  readonly path: string
  readonly kind = 'directory'

  constructor(resolvedPath: string) {
    this.name = basename(resolvedPath)
    this.path = resolvedPath
  }
  async isSameEntry(other: ExtendedFileSystemDirectoryHandle) {
    return other.kind === 'directory' && this.path === other.path
  }
  async remove(options: FileSystemRemoveOptions) {
    await Deno.remove(this.path, options)
  }
  async removeEntry(name: string, options: FileSystemRemoveOptions) {
    const removeTarget = joinPaths(this.path, name)
    await Deno.remove(removeTarget, options)
  }
  async getDirectoryHandle(name: string, options: FileSystemGetDirectoryOptions) {
    return openDir(joinPaths(this.path, name), options)
  }
  async getFileHandle(name: string, options: FileSystemGetFileOptions) {
    return openFile(joinPaths(this.path, name), options)
  }
  async resolve(possibleDescendant: ExtendedFileSystemHandle) {
    if ('path' in possibleDescendant) {
      const relativePath = relative(this.path, possibleDescendant.path)
      return [relativePath]
    }
    return null
  }

  async *entries(): FileSystemDirectoryHandleAsyncIterator<[string, ExtendedFileSystemHandle]> {
    for await (const { name, isFile } of Deno.readDir(this.path)) {
      const childPath = joinPaths(this.path, name)
      const entry: [string, ExtendedFileSystemHandle] = [
        name,
        await (isFile ? openFile : openDir)(childPath)
      ]
      yield entry
    }
  }
  [Symbol.asyncIterator] = () => this.entries()
  async * keys(): FileSystemDirectoryHandleAsyncIterator<string> {
    for await (const { name } of Deno.readDir(this.path)) {
      yield name
    }
  }
  async * values(): FileSystemDirectoryHandleAsyncIterator<ExtendedFileSystemHandle> {
    for await (const [, value] of this.entries()) {
      yield value
    }
  }
}

export const openDir: OpenDir = async (basePath, options) => {
  let stat: Deno.FileInfo | null = null
  try {
    stat = await Deno.stat(basePath)
  } catch (_e) {
    if (options?.create) {
      await Deno.mkdir(basePath, { recursive: true })
    } else {
      throw new DOMException('Directory is not found.', 'NotFoundError')
    }
  }
  if (stat && !stat.isDirectory) {
    throw new DOMException('Target type is not a directiry.', 'TypeMismatchError')
  }

  return new DenoFileSystemDirectoryHandle(resolve(basePath))
}
