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
      const content = await getContentFromKVAsset(`${filename}${EXTENSION}`)
      if (!content) {
        throw new Error(`Template "${filename}${EXTENSION}" is not found or blank.`)
      }

      const partialArgs: { [name: string]: any } = {}
      if (options) {
        const partials = options as Partials
        for (const key of Object.keys(partials)) {
          const partialContent = await getContentFromKVAsset(`${partials[key]}${EXTENSION}`)
          if (!partialContent) {
            throw new Error(`Partial Template "${partials[key]}${EXTENSION}" is not found or blank.`)
          }
          partialArgs[key] = partialContent
        }
      }
      const output = Mustache.render(content, view, partialArgs)
      return c.html(output)
    }
    await next()
  }
}
