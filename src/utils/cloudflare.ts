declare const __STATIC_CONTENT: KVNamespace, __STATIC_CONTENT_MANIFEST: string

export const getContentFromKVAsset = async (path: string): Promise<ArrayBuffer> => {
  let ASSET_MANIFEST: { [key: string]: string }
  if (typeof __STATIC_CONTENT_MANIFEST === 'string') {
    ASSET_MANIFEST = JSON.parse(__STATIC_CONTENT_MANIFEST)
  } else {
    ASSET_MANIFEST = __STATIC_CONTENT_MANIFEST
  }

  const ASSET_NAMESPACE = __STATIC_CONTENT

  const key = ASSET_MANIFEST[path] || path
  if (!key) {
    return
  }

  let content = await ASSET_NAMESPACE.get(key, { type: 'arrayBuffer' })

  if (content) {
    content = content as ArrayBuffer
  }
  return content
}

type Options = {
  filename: string
  root?: string
  defaultDocument?: string
}

export const getKVFilePath = (opt: Options): string => {
  let filename = opt.filename
  let root = opt.root || ''
  const defaultDocument = opt.defaultDocument || 'index.html'

  if (filename.endsWith('/')) {
    // /top/ => /top/index.html
    filename = filename.concat(defaultDocument)
  } else if (!filename.match(/\.[a-zA-Z0-9]+$/)) {
    // /top => /top/index.html
    filename = filename.concat('/' + defaultDocument)
  }

  // /foo.html => foo.html
  filename = filename.replace(/^\//, '')

  // assets/ => assets
  root = root.replace(/\/$/, '')

  // ./assets/foo.html => assets/foo.html
  let path = root ? root + '/' + filename : filename
  path = path.replace(/^\.?\//, '')

  return path
}
