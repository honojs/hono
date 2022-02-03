import type { Context } from '../../context'
import { getContentFromKVAsset, getKVFilePath } from '../../utils/cloudflare'

const EXTENSION = '.mustache'
const DEFAULT_DOCUMENT = 'index.mustache'

type Partials = { [file: string]: string }

type Options = {
  root: string
}

export const mustache = (opt: Options = { root: '' }) => {
  const { root } = opt

  return async (c: Context, next: Function) => {
    let Mustache: any
    try {
      Mustache = require('mustache')
    } catch {
      throw new Error('If you want to use Mustache Middleware, install "mustache" package first.')
    }

    c.render = async (filename, view = {}, options?) => {
      const path = getKVFilePath({ filename: `${filename}${EXTENSION}`, root: root, defaultDocument: DEFAULT_DOCUMENT })

      const buffer = await getContentFromKVAsset(path)
      if (!buffer) {
        throw new Error(`Template "${path}" is not found or blank.`)
      }
      const content = bufferToString(buffer)

      const partialArgs: { [name: string]: string } = {}
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

      const output = Mustache.render(content, view, partialArgs)
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
