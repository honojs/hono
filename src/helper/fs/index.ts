/**
 * FS Helper for Hono.
 * @module
 */

/**
 * Extended FileSystemHandle
 */
export interface ExtendedFileSystemHandle extends FileSystemHandle {
  /**
   * A path of file.
   */
  path: string

  isSameEntry(handle: ExtendedFileSystemHandle): Promise<boolean>

  /**
   * Remove Handle
   * [MDN Reference](https://developer.mozilla.org/docs/Web/API/FileSystemHandle/remove)
   * @param options remove options
   */
  remove(options: {
    recursive: boolean
  }): Promise<void>
}

export type ExtendedFileSystemDirectoryHandle = ExtendedFileSystemHandle & FileSystemDirectoryHandle & {
  getDirectoryHandle(name: string, options?: FileSystemGetDirectoryOptions): Promise<ExtendedFileSystemDirectoryHandle>
  getFileHandle(name: string, options?: FileSystemGetFileOptions): Promise<ExtendedFileSystemFileHandle>
}

export type ExtendedFileSystemFileHandle = ExtendedFileSystemHandle & FileSystemFileHandle

/**
 * Create a FileSystemDirectoryHandle
 *
 * @param basePath - The base path of the file system directory.
 * @return ExtendedFileSystemDirectoryHandle.
 */
export type OpenDir = (basePath: string, options?: FileSystemGetDirectoryOptions) => Promise<ExtendedFileSystemDirectoryHandle>

export type OpenFile = (targetPath: string, options?: FileSystemGetFileOptions) => Promise<ExtendedFileSystemFileHandle>

/**
 * Returns the last component of a file path.
 *
 * @param path - The file path.
 * @return The last component of the file path.
 */
export const basename = (path: string): string => path.split(/[\/\\]/).at(-1) ?? ''
