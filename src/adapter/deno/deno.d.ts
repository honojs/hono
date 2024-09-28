declare namespace Deno {
  /**
   * Creates a new directory with the specified path.
   *
   * @param path The path to create a directory.
   * @param options Options for creating a directory.
   * @returns A promise that resolves when the directory is created.
   */
  export function mkdir(path: string, options?: { recursive?: boolean }): Promise<void>

  export function lstatSync(path: string): {
    isDirectory: boolean
    size: number
  }

  /**
   * Write a new file, with the specified path and data.
   *
   * @param path The path to the file to write.
   * @param data The data to write to the file.
   * @returns A promise that resolves when the file is written.
   */
  export function writeFile(path: string, data: Uint8Array): Promise<void>

  export function upgradeWebSocket(
    req: Request,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    options: any
  ): {
    response: Response
    socket: WebSocket
  }

  export function open(path: string): Promise<FsFile>

  export enum SeekMode {
    Start = 0,
  }

  export function seekSync(rid: number, offset: number, whence: SeekMode): number
  export function readSync(rid: number, buffer: Uint8Array): number

  export type FsFile = {
    rid: number
    readable: ReadableStream<Uint8Array>
    close(): void
  }
}
