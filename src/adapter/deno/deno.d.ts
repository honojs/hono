declare namespace Deno {
  /**
   * Creates a new directory with the specified path.
   *
   * @param path The path to create a directory.
   * @param options Options for creating a directory.
   * @returns A promise that resolves when the directory is created.
   */
  export function mkdir(path: string, options?: { recursive?: boolean }): Promise<void>

  /**
   * Write a new file, with the specified path and data.
   *
   * @param path The path to the file to write.
   * @param data The data to write to the file.
   * @returns A promise that resolves when the file is written.
   */
  export function writeFile(path: string, data: Uint8Array): Promise<void>

  export function remove(path: string, options?: {
    recursive?: boolean
  }): Promise<void>

  export function readDir(path: string): AsyncIterable<{
    name: string
    isFile: boolean
    isDirectory: boolean
    isSymlink: boolean
  }>

  export interface FileInfo {
    isDirectory: boolean
  }

  export function stat(path: string): Promise<FileInfo>

  export interface OpenOptions {
    read?: boolean
    write?: boolean
    append?: boolean
    truncate?: boolean
    create?: boolean
    createNew?: boolean
    mode?: number
  }

  export type SeekMode = 0 | 1 | 2
  export interface FsFile {
    readonly readable: ReadableStream<Uint8Array>
    readonly writable: WritableStream<Uint8Array>

    close(): void
    seek(offset: number, whence?: SeekMode): Promise<void>
    truncate(len?: number): Promise<void>

    write(p: Uint8Array): Promise<number>
  }
  export function open(
    path: string | URL,
    options?: OpenOptions,
  ): Promise<FsFile> 

  export function upgradeWebSocket(
    req: Request,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    options: any
  ): {
    response: Response
    socket: WebSocket
  }

  export function cwd(): string
}
