import Mustache from 'mustache'
import type { Context } from '../../context'
import type { Handler, Next } from '../../hono'
import { bufferToString } from '../../utils/buffer'
import type { KVAssetOptions } from '../../utils/cloudflare'
import { getContentFromKVAsset, getKVFilePath } from '../../utils/cloudflare'

const EXTENSION = '.mustache'
const DEFAULT_DOCUMENT = 'index.mustache'

type Partials = Record<string, string>

interface Mustache {
  render: (content: string, params: object, partials: Partials) => string
}

export type MustacheOptions = {
  root: string
  manifest?: object | string
  namespace?: KVNamespace
}

export const mustache = (init: MustacheOptions = { root: '' }): Handler => {
  const { root } = init

  return async (c: Context, next: Next) => {
    c.render = async (filename, params = {}, options?) => {
      const path = getKVFilePath({
        filename: `${filename}${EXTENSION}`,
        root: root,
        defaultDocument: DEFAULT_DOCUMENT,
      })

      const kvAssetOptions: KVAssetOptions = {
        manifest: init.manifest,
        namespace: init.namespace ? init.namespace : c.env ? c.env.__STATIC_CONTENT : undefined,
      }

      const buffer = await getContentFromKVAsset(path, kvAssetOptions)
      if (!buffer) {
        throw new Error(`Template "${path}" is not found or blank.`)
      }
      const content = bufferToString(buffer)

      const partialArgs: Record<string, string> = {}

      if (options) {
        const partials = options as Partials
        for (const key of Object.keys(partials)) {
          const partialPath = getKVFilePath({
            filename: `${partials[key]}${EXTENSION}`,
            root: root,
            defaultDocument: DEFAULT_DOCUMENT,
          })
          const partialBuffer = await getContentFromKVAsset(partialPath, kvAssetOptions)
          if (!partialBuffer) {
            throw new Error(`Partial Template "${partialPath}" is not found or blank.`)
          }
          partialArgs[key] = bufferToString(partialBuffer)
        }
      }

      const output = Mustache.render(content, params, partialArgs)
      return c.html(output)
    }

    await next()
  }
}
