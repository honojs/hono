/**
 * Utility functions for defining filesystem adapters.
 * @module
 */

/**
 * Returns the last component of a file path.
 *
 * @param path - The file path.
 * @return The last component of the file path.
 */
export const basename = (path: string): string => path.split(/[\/\\]/).at(-1) ?? ''


/**
 * Checks if the provided data object is of type `WriteParams`.
 *
 * @param data - The data object to check.
 * @returns `true` if the object is of type `WriteParams`, `false` otherwise.
 */
export const isWriteParams = (data: FileSystemWriteChunkType): data is WriteParams => {
  // Determine if `type` exists
  // Additionally, `Blob` has a `type`, so return early
  // Also in string, can't use `in`
  if (data instanceof Blob || typeof data === 'string') {
    return true
  }

  return 'type' in data
}
