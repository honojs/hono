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
}

/**
 * Interface for defining object in filesystem such as directlys, files, and symlinks.
 */
export type FsObj<OpenOptionsType extends OpenOptions> = {
  /**
   * Get file info
   */
  stat (): Promise<FsObjInfo>
  /**
   * Close file.
   */
  close (): Promise<void>
} & (OpenOptionsType['read'] extends false ? {} : {
  /**
   * Get file readable stream
   */
  readonly readable: ReadableStream<Uint8Array>
}) & (OpenOptionsType['write'] extends true ? {
  /**
   * Get file writable stream
   */
  readonly writable: WritableStream<Uint8Array>
} : {})

export interface OpenOptions {
  /**
   * Create new file if target path is not exists when it's true.
   */
  create?: boolean

  /**
   * You can read file if it's true.
   * Default is `true`
   */
  read?: boolean
  /**
   * You can read file if it's true.
   * Default is `false`
   */
  write?: boolean
}

/**
 * Interface for defining file system wrappers.
 */
export interface FileSystemWrapper {
  /**
   * Open filesystem object.
   */
  open <OpenOptionsType extends OpenOptions>(path: string | URL, options?: OpenOptionsType): Promise<FsObj<OpenOptionsType>>
  
  /**
   * Remove filesystem object.
   */
  remove (path: string | URL): Promise<void>

  /**
   * Read dir
   */
  readDir (path: string | URL): AsyncGenerator<string>

  /**
   * Make dir
   */
  mkdir (path: string | URL): Promise<void>

  /**
   * Make symlink
   */
  symlink (oldpath: string | URL, newpath: string | URL, type?: 'file' | 'dir'): Promise<void>

  /**
   * Rename
   */
  rename (oldpath: string | URL, newpath: string | URL): Promise<void>

  /**
   * Watch files
   */
  watch(paths: string[], options?: { recursive: boolean; }): {
    [Symbol.asyncIterator]: () => AsyncGenerator<{
      kind: 'any' | 'access' | 'create' | 'modify' | 'remove' | 'other'
      paths: string[]
    }, unknown, unknown>
    close(): Promise<void>
  }
}

