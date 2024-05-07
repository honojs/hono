const DEFAULT_DOCUMENT = 'index.html'
const VALID_EXTENSION_REGEX = /\.[a-zA-Z0-9]+$/
const PARENT_DIRECTORY_REGEX = /(?:^|[\/\\])\.\.(?:$|[\/\\])/

type FilePathOptions = {
  filename: string
  root?: string
  defaultDocument?: string
}

/**
 * Retrieves the file path based on the provided options.
 * If no default document is specified, 'index.html' is appended to the path.
 * If the filename ends with '/', the default document is appended.
 * If the filename has no valid extension, the default document is appended.
 * @param options - The options object containing filename, root, and defaultDocument.
 * @returns The final file path or undefined if parent directory traversal is detected.
 */
export const getFilePath = ({
  filename,
  defaultDocument,
  root,
}: FilePathOptions): string | undefined => {
  const isDefaultDocument = defaultDocument || DEFAULT_DOCUMENT

  const shouldAppendDefault = filename.endsWith('/') || !filename.match(VALID_EXTENSION_REGEX)

  const finalFilename = shouldAppendDefault
    ? filename.concat('/', isDefaultDocument || DEFAULT_DOCUMENT)
    : filename

  return getFilePathWithoutDefaultDocument({
    root,
    filename: finalFilename,
  })
}

/**
 * Retrieves the file path without appending the default document.
 * If parent directory traversal is detected in the filename, returns undefined.
 * Replaces backslashes with forward slashes and removes redundant slashes.
 * @param options The options object containing filename and root.
 * @returns The sanitized file path.
 */
export const getFilePathWithoutDefaultDocument = ({
  filename,
  root = '',
}: Omit<FilePathOptions, 'defaultDocument'>) => {
  if (PARENT_DIRECTORY_REGEX.test(filename)) {
    return
  }

  const sanitizedFilename = filename.replace(/^\.?[\/\\]/, '').replace(/\\/, '/')
  const sanitizedRoot = root.replace(/\/$/, '')

  const path = sanitizedRoot ? sanitizedRoot + '/' + sanitizedFilename : sanitizedFilename

  return path.replace(/^\.?\//, '')
}
