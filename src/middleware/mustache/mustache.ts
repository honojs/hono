import type { Context } from '../../context'
import { getContentFromKVAsset } from '../../utils/cloudflare'

const EXTENSION = '.mustache'

type Partials = { [file: string]: string }

export const mustache = () => {
  let Mustache: any
  try {
    Mustache = require('mustache')
  } catch {
    // Do nothing.
  }

  return async (c: Context, next: Function) => {
    if (!Mustache) {
      throw new Error('If you want to use Mustache Middleware, install mustache module.')
    }

    c.render = async (filename, view = {}, options?) => {
      const buffer = await getContentFromKVAsset(`${filename}${EXTENSION}`)
      if (!buffer) {
        throw new Error(`Template "${filename}${EXTENSION}" is not found or blank.`)
      }
      const content = bufferToString(buffer)

      const partialArgs: { [name: string]: string } = {}
      if (options) {
        const partials = options as Partials
        for (const key of Object.keys(partials)) {
          const partialBuffer = await getContentFromKVAsset(`${partials[key]}${EXTENSION}`)
          if (!partialBuffer) {
            throw new Error(`Partial Template "${partials[key]}${EXTENSION}" is not found or blank.`)
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
