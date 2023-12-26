import { raw } from '../../helper/html'
import { type HtmlEscapedCallback } from '../../utils/html'

type Styles = Record<string, string>
const styles: Styles = {}

const DEFAULT_STYLE_ID = 'hono-css'

/**
 * Used the goober'code as a reference:
 * https://github.com/cristianbote/goober/blob/master/src/core/to-hash.js
 * MIT License, Copyright (c) 2019 Cristian Bote
 */
const toHash = (str: string): string => {
  let i = 0,
    out = 11
  while (i < str.length) {
    out = (101 * out + str.charCodeAt(i++)) >>> 0
  }
  return 'css-' + out
}

export const keyframes = (strings: TemplateStringsArray, ...values: string[]): string => {
  let styleString = ''
  strings.forEach((string, index) => {
    string = string.trim().replace(/\n\s*/g, ' ')
    styleString += string + (values[index] || '')
  })
  const className = `@keyframes ${toHash(styleString)}`
  styles[className] = styleString
  return className
}

type contextCssData = [
  { [className: string]: true }, // class name to add
  { [className: string]: true } // class name already added
]
const cssMap: Map<unknown, contextCssData> = new Map()
export const css = (() => {
  let id = DEFAULT_STYLE_ID

  const css = async (strings: TemplateStringsArray, ...values: string[]): Promise<string> => {
    const selectors: string[] = []
    let styleString = ''
    strings.forEach((string, index) => {
      string = string.trim().replace(/\n\s*/g, ' ')
      const value = values[index]
      if (value && value.startsWith('@keyframes ')) {
        selectors.push(value)
        styleString += `${string} ${value.substring(11)} `
      } else {
        styleString += string + (value || '')
      }
    })
    const selector = `.${toHash(styleString)}`
    styles[selector] = styleString
      .replace(
        /(^|;)([^;]*)({[^}]+})([\s\r\n]*}[\s\r\n]*$)?/,
        (_, pre, subSelector, content, close) => {
          return `${pre}}${subSelector.replace(/&/g, selector)}${content}${
            close ? '' : `${selector}{`
          }`
        }
      )
      .replace(/{}/g, '')
    selectors.push(selector)

    const appendStyle: HtmlEscapedCallback = ({ buffer, context }): Promise<string> | undefined => {
      const [toAdd, added] = cssMap.get(context) as contextCssData
      const names = Object.keys(toAdd)

      if (!names.length) {
        return
      }

      const stylesStr = names.reduce((acc, className) => {
        added[className] = true
        acc += `${className}{${styles[className]}}`
        return acc
      }, '')
      cssMap.set(context, [{}, added])

      if (buffer) {
        let replaced = false
        buffer[0] = buffer[0].replace(
          new RegExp(`(<style id="${id}">.*?)(</style>)`),
          (_, pre, post) => {
            replaced = true
            return `${pre}${stylesStr}${post}`
          }
        )
        if (replaced) {
          return
        }
      }

      const appendStyleScript = `<script>document.querySelector('#${id}').textContent+=${JSON.stringify(
        stylesStr
      )}</script>`
      if (buffer) {
        buffer[0] = `${appendStyleScript}${buffer[0]}`
        return
      }

      return Promise.resolve(appendStyleScript)
    }

    const addClassNameToContext: HtmlEscapedCallback = ({ phase, context }) => {
      if (!cssMap.get(context)) {
        cssMap.set(context, [{}, {}])
      }
      const [toAdd, added] = cssMap.get(context) as contextCssData
      let allAdded = true
      selectors.forEach((className) => {
        if (!added[className]) {
          allAdded = false
          toAdd[className] = true
        }
      })
      if (allAdded) {
        return
      }

      return Promise.resolve(raw('', [appendStyle]))
    }

    return raw(selector.slice(1), [addClassNameToContext])
  }

  Object.defineProperty(css, 'id', {
    get: () => id,
    set: (newId: string) => {
      id = newId
    },
  })

  return css
})()

export const Style = ({ id }: { id?: string } = {}) =>
  raw(`<style id="${id || DEFAULT_STYLE_ID}"></style>`)
