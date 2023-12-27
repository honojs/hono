import { raw } from '../../helper/html'
import { type HtmlEscapedCallback } from '../../utils/html'

type CssEscaped = {
  isCssEscaped: true
}
type CssEscapedString = string & CssEscaped

/**
 * @experimental
 * `rawCssString` is an experimental feature.
 * The API might be changed.
 */
export const rawCssString = (value: string): CssEscapedString => {
  const escapedString = new String(value) as CssEscapedString
  escapedString.isCssEscaped = true
  return escapedString
}

// eslint-disable-next-line @typescript-eslint/ban-types
type Styles = WeakMap<object, String>
const styles: Styles = new WeakMap()

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

const cssStringReStr = [
  '"(?:(?:\\\\[\\s\\S]|[^"\\\\])*)"', // double quoted string
  // eslint-disable-next-line quotes
  "'(?:(?:\\\\[\\s\\S]|[^'\\\\])*)'", // single quoted string
].join('|')
const minifyCssRe = new RegExp(
  [
    '(' + cssStringReStr + ')', // $1: quoted string

    '(?:' +
      [
        '^\\s+', // head whitespace
        '\\/\\*.*?\\*\\/\\s*', // multi-line comment
        '\\/\\/.*\\n\\s*', // single-line comment
        '\\s+$', // tail whitespace
      ].join('|') +
      ')',

    ';\\s*(}|$)\\s*', // $2: trailing semicolon
    '\\s*([{};:,])\\s*', // $3: whitespace around { } : , ;
    '(\\s)\\s+', // $4: 2+ spaces
  ].join('|'),
  'g'
)

const minify = (css: string): string => {
  return css.replace(minifyCssRe, (_, $1, $2, $3, $4) => $1 || $2 || $3 || $4 || '')
}

type usedClassNameData = [
  // eslint-disable-next-line @typescript-eslint/ban-types
  Map<String, true>, // class name to add
  // eslint-disable-next-line @typescript-eslint/ban-types
  Map<String, true> // class name already added
]

/**
 * @experimental
 * `createCssContext` is an experimental feature.
 * The API might be changed.
 */
export const createCssContext = ({ id }: { id: Readonly<string> }) => {
  const contextMap: WeakMap<object, usedClassNameData> = new WeakMap()

  const replaceStyleRe = new RegExp(`(<style id="${id}">.*?)(</style>)`)

  const css = async (
    strings: TemplateStringsArray,
    // eslint-disable-next-line @typescript-eslint/ban-types
    ...values: (string | string | Promise<string> | Promise<String>)[]
  ): Promise<string> => {
    // eslint-disable-next-line @typescript-eslint/ban-types
    const selectors: String[] = []
    let styleString = ''
    for (let i = 0; i < strings.length; i++) {
      const string = strings[i]
      let value = (values[i] instanceof Promise ? await values[i] : values[i]) as string
      if (value && value.startsWith('@keyframes ')) {
        selectors.push(value)
        styleString += `${string} ${value.substring(11)} `
      } else {
        if (value && !(value as CssEscapedString).isCssEscaped && /([\\"'\/])/.test(value)) {
          value = value.replace(/([\\"'\/])/g, '\\$1')
        }
        styleString += `${string}${value || ''}`
      }
    }
    styleString = minify(styleString)
    const selector = new String(toHash(styleString))
    styles.set(selector, styleString)
    selectors.push(selector)

    const appendStyle: HtmlEscapedCallback = ({ buffer, context }): Promise<string> | undefined => {
      const [toAdd, added] = contextMap.get(context) as usedClassNameData
      const names = [...toAdd.keys()]

      if (!names.length) {
        return
      }

      let stylesStr = ''
      names.forEach((className) => {
        added.set(className, true)
        const content = styles.get(className)
        stylesStr += `${className[0] === '@' ? '' : '.'}${className}{${content}}`
      })
      contextMap.set(context, [new Map(), added])

      if (buffer && replaceStyleRe.test(buffer[0])) {
        buffer[0] = buffer[0].replace(replaceStyleRe, (_, pre, post) => `${pre}${stylesStr}${post}`)
        return
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

    const addClassNameToContext: HtmlEscapedCallback = ({ context }) => {
      if (!contextMap.get(context)) {
        contextMap.set(context, [new Map(), new Map()])
      }
      const [toAdd, added] = contextMap.get(context) as usedClassNameData
      let allAdded = true
      selectors.forEach((className) => {
        if (!added.has(className)) {
          allAdded = false
          toAdd.set(className, true)
        }
      })
      if (allAdded) {
        return
      }

      return Promise.resolve(raw('', [appendStyle]))
    }

    return raw(selector, [addClassNameToContext])
  }

  const keyframes = async (
    strings: TemplateStringsArray,
    ...values: (string | Promise<string>)[]
  ): // eslint-disable-next-line @typescript-eslint/ban-types
  Promise<String> => {
    let styleString = ''
    for (let i = 0; i < strings.length; i++) {
      const string = strings[i]
      let value = (values[i] instanceof Promise ? await values[i] : values[i]) as string
      if (value && !(value as CssEscapedString).isCssEscaped && /([\\"'\/])/.test(value)) {
        value = value.replace(/([\\"'\/])/g, '\\$1')
      }
      styleString += `${string}${value || ''}`
    }
    styleString = minify(styleString)
    const className = new String(`@keyframes ${toHash(styleString)}`)
    styles.set(className, styleString)
    return className
  }

  const Style = () => raw(`<style id="${id}"></style>`)

  return {
    css,
    keyframes,
    Style,
  }
}

const defaultContext = createCssContext({ id: DEFAULT_STYLE_ID })

/**
 * @experimental
 * `css` is an experimental feature.
 * The API might be changed.
 */
export const css = defaultContext.css

/**
 * @experimental
 * `keyframes` is an experimental feature.
 * The API might be changed.
 */
export const keyframes = defaultContext.keyframes

/**
 * @experimental
 * `Style` is an experimental feature.
 * The API might be changed.
 */
export const Style = defaultContext.Style
