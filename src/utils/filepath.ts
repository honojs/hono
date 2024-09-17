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
    // Using URL to normalize the path.
    const url = new URL(`file://${path}`)
    path = url.pathname
  }

  return path
}
