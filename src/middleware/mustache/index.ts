import type { Context } from '@/context'
import { getContentFromKVAsset, getKVFilePath } from '../../utils/cloudflare'

const EXTENSION = '.mustache'
const DEFAULT_DOCUMENT = 'index.mustache'

type Partials = Record<string, string>

interface Mustache {
  render: (content: string, params: object, partials: Partials) => string
}

type Init = {
  root: string
}

export const mustache = (init: Init = { root: '' }) => {
  const { root } = init

  return async (c: Context, next: Function) => {
    let Mustache: Mustache
    try {
      Mustache = require('mustache')
    } catch {
      throw new Error('If you want to use Mustache Middleware, install "mustache" package first.')
    }

    c.render = async (filename, params = {}, options?) => {
      const path = getKVFilePath({
        filename: `${filename}${EXTENSION}`,
        root: root,
        defaultDocument: DEFAULT_DOCUMENT,
      })

      const buffer = await getContentFromKVAsset(path)
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
          const partialBuffer = await getContentFromKVAsset(partialPath)
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

const bufferToString = (buffer: ArrayBuffer): string => {
  if (buffer instanceof ArrayBuffer) {
    const enc = new TextDecoder('utf-8')
    return enc.decode(buffer)
  }
  return buffer
}
