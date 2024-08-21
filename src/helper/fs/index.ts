/**
 * FS Helper for Hono.
 * @module
 */


/**
 * Create a FileSystemDirectoryHandle factory function.
 *
 * @param basePath - The base path of the file system directory.
 * @return FileSystemDirectoryHandle.
 */
export type CreateFS = (basePath: string) => Promise<FileSystemDirectoryHandle>

/**
 * Returns the last component of a file path.
 *
 * @param path - The file path.
 * @return The last component of the file path.
 */
export const basename = (path: string): string => path.split(/[\/\\]/).at(-1) ?? ''
