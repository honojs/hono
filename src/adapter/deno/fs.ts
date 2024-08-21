/**
 * FS Adapter for Deno.
 * @module
 */

import { basename } from '../../helper/fs'
import type { ExtendedFileSystemDirectoryHandle, OpenDir, OpenFile } from '../../helper/fs'
import { joinPaths } from '../../utils/filepath/join'

export const resolve = (path: string) => {
  const cwd = Deno.cwd()

  return joinPaths(cwd, path)
}

export const openFile: OpenFile = async (path) => {
  // TODO
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

  const handle: ExtendedFileSystemDirectoryHandle = {
    name: basename(basePath),
    kind: 'directory',
    path: resolve(basePath),
    async isSameEntry(other) {
      const otherPath = 'path' in other ? other.path : ''
      return other.kind === 'directory' && this.path === otherPath
    },
    async remove(options) {
      await Deno.remove(this.path, options)
    },
    async removeEntry(name, options) {
      const removeTarget = joinPaths(this.path, name)
      await Deno.remove(removeTarget, options)
    },
    async getDirectoryHandle(name, options) {
      return openDir(joinPaths(this.path, name), options)
    },
    async getFileHandle(name, options) {
      return openFile(joinPaths(this.path, name), options)
    },
    async resolve(possibleDescendant) {
      // TODO
    },
  }
  return handle
}
