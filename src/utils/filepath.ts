/**
 * @module
 * FilePath utility.
 */

type FilePathOptions = {
  filename: string
  root?: string
  defaultDocument?: string
  allowAbsoluteRoot?: boolean
}

export const getFilePath = (options: FilePathOptions): string | undefined => {
  let filename = options.filename
  const defaultDocument = options.defaultDocument || 'index.html'

  if (filename.endsWith('/')) {
    // /top/ => /top/index.html
    filename = filename.concat(defaultDocument)
  } else if (!filename.match(/\.[a-zA-Z0-9_-]+$/)) {
    // /top => /top/index.html
    filename = filename.concat('/' + defaultDocument)
  }

  const path = getFilePathWithoutDefaultDocument({
    root: options.root,
    allowAbsoluteRoot: options.allowAbsoluteRoot,
    filename,
  })

  return path
}

const normalizeFilePath = (filePath: string) => {
  const parts = filePath.split(/[\/\\]/)

  const result = []

  for (const part of parts) {
    if (part === '' || part === '.') {
      continue
    } else if (part === '..') {
      result.pop()
    } else {
      result.push(part)
    }
  }

  return '/' + (result.length === 1 ? result[0] : result.join('/'))
}

export const getFilePathWithoutDefaultDocument = (
  options: Omit<FilePathOptions, 'defaultDocument'>
): string | undefined => {
  let root = options.root || ''
  let filename = options.filename

  if (/(?:^|[\/\\])\.\.(?:$|[\/\\])/.test(filename)) {
    return
  }

  // /foo.html => foo.html
  filename = filename.replace(/^\.?[\/\\]/, '')

  // assets\foo => assets/foo
  root = root.replace(/\\/, '/')

  // foo\bar.txt => foo/bar.txt
  filename = filename.replace(/\\/, '/')

  // assets/ => assets
  root = root.replace(/\/$/, '')

  // ./assets/foo.html => assets/foo.html
  let path = root ? root + '/' + filename : filename

  if (!options.allowAbsoluteRoot) {
    path = path.replace(/^\.?\//, '')
  } else {
    // assets => /assets
    path = path.replace(/^(?!\/)/, '/')
    // /assets/foo/../bar => /assets/bar
    path = normalizeFilePath(path)
  }

  return path
}
