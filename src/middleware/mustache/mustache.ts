import type { Context } from '../../context'
import { getContentFromKVAsset } from '../../utils/cloudflare'

const EXTENSION = '.mustache'

type MustachePartial = { [file: string]: string }

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
      // TODO: Check if filename has extension or not.
      const template = await getContentFromKVAsset(`${filename}${EXTENSION}`)
      if (!template) {
        throw new Error('Template is undefined')
      }
      console.log(`${template}`)

      const partialArgs: { [name: string]: string } = {}
      if (options) {
        const partials = options as MustachePartial
        for (const key of Object.keys(partials)) {
          const partialContent = await getContentFromKVAsset(`${partials[key]}${EXTENSION}`)
          if (!partialContent) {
            throw new Error('Partial is undefined')
          }
          partialArgs[key] = partialContent
        }
      }

      const output = Mustache.render(template, view, partialArgs)
      return c.html(output)
    }
    await next()
  }
}
