import type { Context } from '../../context'
import { getContentFromKVAsset } from '../../utils/cloudflare'

const EXTENSION = '.mustache'

type Partials = { [file: string]: string }

export const mustache = () => {
  return async (c: Context, next: Function) => {
    let Mustache: any

    try {
      Mustache = await import('mustache')
    } catch (e) {
      console.error(`Mustache is not found! ${e}`)
      throw new Error(`${e}`)
    }

    c.render = async (filename, view = {}, options?) => {
      const content = await getContentFromKVAsset(`${filename}${EXTENSION}`)
      if (!content) {
        throw new Error(`Template "${filename}${EXTENSION}" is not found`)
      }

      const partialArgs: { [name: string]: string } = {}
      if (options) {
        const partials = options as Partials
        for (const key of Object.keys(partials)) {
          const partialContent = await getContentFromKVAsset(`${partials[key]}${EXTENSION}`)
          if (!partialContent) {
            throw new Error(`Partial Template "${partials[key]}${EXTENSION}" is not found`)
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
