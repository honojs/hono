declare const __STATIC_CONTENT: KVNamespace
declare const __STATIC_CONTENT_MANIFEST: string

export type KVAssetOptions = {
  manifest?: object | string
  namespace?: KVNamespace
}

export const getContentFromKVAsset = async (
  path: string,
  options?: KVAssetOptions
): Promise<ArrayBuffer | null> => {
  let ASSET_MANIFEST: Record<string, string> = {}

  if (options && options.manifest) {
    if (typeof options.manifest === 'string') {
      ASSET_MANIFEST = JSON.parse(options.manifest) as Record<string, string>
    } else {
      ASSET_MANIFEST = options.manifest as Record<string, string>
    }
  } else {
    if (typeof __STATIC_CONTENT_MANIFEST === 'string') {
      ASSET_MANIFEST = JSON.parse(__STATIC_CONTENT_MANIFEST) as Record<string, string>
    } else {
      ASSET_MANIFEST = __STATIC_CONTENT_MANIFEST
    }
  }

  let ASSET_NAMESPACE: KVNamespace
  if (options && options.namespace) {
    ASSET_NAMESPACE = options.namespace
  } else {
    ASSET_NAMESPACE = __STATIC_CONTENT
  }

  const key = ASSET_MANIFEST[path] || path
  if (!key) {
    return null
  }

  const content = await ASSET_NAMESPACE.get(key, { type: 'arrayBuffer' })

  return content
}

type FilePathOptions = {
  filename: string
  root?: string
  defaultDocument?: string
}

export const getKVFilePath = (options: FilePathOptions): string => {
  let filename = options.filename
  let root = options.root || ''
  const defaultDocument = options.defaultDocument || 'index.html'

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
