// @denoify-ignore
import type { KVNamespace } from '@cloudflare/workers-types'
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
      ASSET_MANIFEST = JSON.parse(options.manifest)
    } else {
      ASSET_MANIFEST = options.manifest as Record<string, string>
    }
  } else {
    if (typeof __STATIC_CONTENT_MANIFEST === 'string') {
      ASSET_MANIFEST = JSON.parse(__STATIC_CONTENT_MANIFEST)
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
  if (!content) {
    return null
  }
  return content as unknown as ArrayBuffer
}
