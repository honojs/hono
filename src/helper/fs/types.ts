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
  remove(options: FileSystemRemoveOptions): Promise<void>
}

export type ExtendedFileSystemDirectoryHandle = ExtendedFileSystemHandle & FileSystemDirectoryHandle & {
  getDirectoryHandle(name: string, options?: FileSystemGetDirectoryOptions): Promise<ExtendedFileSystemDirectoryHandle>
  getFileHandle(name: string, options?: FileSystemGetFileOptions): Promise<ExtendedFileSystemFileHandle>
  resolve(possibleDescendant: ExtendedFileSystemHandle): Promise<string[] | null>

  entries(): FileSystemDirectoryHandleAsyncIterator<[string, ExtendedFileSystemHandle]>
  values(): FileSystemDirectoryHandleAsyncIterator<ExtendedFileSystemHandle>
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
