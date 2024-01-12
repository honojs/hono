type ObjectKind = {
  /**
   * If this is info for a file, it's true.
   */
  isFile: boolean
  /**
   * If this is info for a directory, it's true.
   */
  isDirectory: boolean
  /**
   * If this is info for a symlink, it's true.
   */
  isSymlink: boolean
} & {
  isFile: true
  isDirectory: false
  isSymlink: false
} | {
  isFile: false
  isDirectory: true
  isSymlink: false
} | {
  isFile: false
  isDirectory: false
  isSymlink: true
}

/**
 * Filesystem object info.
 */
export type FsObjInfo = ObjectKind & {
  /**
   * File size (number)
   */
  size: number

  readable (): ReadableStream<Uint8Array>
  writable (): WritableStream<Uint8Array>

  /**
   * File path
   */
  path: string
}

/**
 * Interface for defining object in filesystem such as directlys, files, and symlinks.
 */
export interface FsObj {
  /**
   * Get file info
   */
  stat (): Promise<FsObjInfo>
}

export interface OpenOptions {
  /**
   * Create new file if target path is not exists when it's true.
   */
  create?: boolean
}

/**
 * Interface for defining file system wrappers.
 */
export interface FileSystemWrapper {
  /**
   * Open filesystem object
   */
  open (path: string | URL, options?: OpenOptions): Promise<FsObj>
  
  /**
   * Remove filesystem object.
   */
  remove (path: string | URL): Promise<void>

  /**
   * Walk dir
   */
  walk (): AsyncGenerator<string>

  /**
   * Make dir
   */
  mkdir (path: string | URL): Promise<void>

  /**
   * Make symlink
   */
  symlink (oldpath: string | URL, newpath: string | URL, type?: 'file' | 'dir'): Promise<void>
}
