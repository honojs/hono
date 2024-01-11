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
}
