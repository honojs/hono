declare namespace Deno {
  interface FileHandleLike {
    readonly readable: ReadableStream<Uint8Array>
  }

  /**
   * Open the file using the specified path.
   *
   * @param path The path to open the file.
   * @returns FileHandle object.
   */
  export function open(path: string): Promise<FileHandleLike>

  interface StatsLike {
    isDirectory: boolean
  }

  /**
   * Get stats with the specified path.
   *
   * @param path The path to get stats.
   * @returns Stats object.
   */
  export function lstatSync(path: string): StatsLike

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
   * @param data The data to write into the file.
   * @returns A promise that resolves when the file is written.
   */
  export function writeFile(path: string, data: Uint8Array): Promise<void>

  /**
   * Errors of Deno
   */
  export const errors: Record<string, Function>

  export function upgradeWebSocket(
    req: Request,
    options: UpgradeWebSocketOptions
  ): {
    response: Response
    socket: WebSocket
  }

  /**
   * Options of `upgradeWebSocket`
   */
  export interface UpgradeWebSocketOptions {
    /**
     * Sets the `.protocol` property on the client-side web socket to the
     * value provided here, which should be one of the strings specified in the
     * `protocols` parameter when requesting the web socket. This is intended
     * for clients and servers to specify sub-protocols to use to communicate to
     * each other.
     */
    protocol?: string
    /**
     * If the client does not respond to this frame with a
     * `pong` within the timeout specified, the connection is deemed
     * unhealthy and is closed. The `close` and `error` events will be emitted.
     *
     * The unit is seconds, with a default of 30.
     * Set to `0` to disable timeouts.
     */
    idleTimeout?: number
  }
}
