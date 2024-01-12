type ObjectKindName = 'file' | 'dir' | 'symlink'
type ObjectKind<Kind extends ObjectKindName = ObjectKindName> = {
  /**
   * If this is info for a file, it's true.
   */
  isFile: Kind extends 'file' ? true : false
  /**
   * If this is info for a directory, it's true.
   */
  isDirectory: Kind extends 'dir' ? true : false
  /**
   * If this is info for a symlink, it's true.
   */
  isSymlink: Kind extends 'symlink' ? true : false
}

/**
 * Filesystem object info.
 */
export type FsObjInfo = ObjectKind & {
  /**
   * File size (number)
   */
  size: number

  /**
   * File path
   */
  path: string
}

/**
 * Interface for defining object in filesystem such as directlys, files, and symlinks.
 */
export type FsObj = {
  /**
   * Get file info
   */
  stat (): Promise<FsObjInfo>
} & {
  /**
   * Get file readable stream
   */
  readable (): ReadableStream<Uint8Array>
  /**
   * Get file writable stream
   */
  writable (): WritableStream<Uint8Array>
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
