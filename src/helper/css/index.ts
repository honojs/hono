import { raw } from '../../helper/html'
import type { HtmlEscapedCallback, HtmlEscapedString } from '../../utils/html'

const IS_CSS_CLASS_NAME = Symbol('IS_CSS_CLASS_NAME')
const STYLE_STRING = Symbol('STYLE_STRING')
const SELECTORS = Symbol('SELECTORS')
const EXTERNAL_CLASS_NAMES = Symbol('EXTERNAL_CLASS_NAMES')
type CssClassName = HtmlEscapedString & {
  [IS_CSS_CLASS_NAME]: true
  [STYLE_STRING]: string
  // eslint-disable-next-line @typescript-eslint/ban-types
  [SELECTORS]: String[]
  [EXTERNAL_CLASS_NAMES]: string[]
}

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
  Record<string, string>, // class name to add
  Record<string, true> // class name already added
]
// eslint-disable-next-line @typescript-eslint/ban-types
type CssVariableBasicType = string | String | number | boolean | null | undefined
type CssVariableAsyncType = Promise<CssVariableBasicType>
type CssVariableArrayType = (CssVariableBasicType | CssVariableAsyncType)[]
type CssVariableType = CssVariableBasicType | CssVariableAsyncType | CssVariableArrayType

const buildStyleString = async (
  strings: TemplateStringsArray,
  values: CssVariableType[],
  // eslint-disable-next-line @typescript-eslint/ban-types
  selectors: String[],
  externalClassNames: string[]
): Promise<string> => {
  let styleString = ''
  for (let i = 0; i < strings.length; i++) {
    styleString += strings[i]
    let vArray = values[i]
    if (typeof vArray === 'boolean' || vArray === null || vArray === undefined) {
      continue
    }

    if (!Array.isArray(vArray)) {
      vArray = [vArray] as CssVariableArrayType
    }
    for (let j = 0; j < vArray.length; j++) {
      let value = (
        vArray[j] instanceof Promise ? await vArray[j] : vArray[j]
      ) as CssVariableBasicType
      if (typeof value === 'boolean' || value === null || value === undefined) {
        continue
      }
      if (typeof value === 'number') {
        styleString += value
      } else if (value.startsWith('@keyframes ')) {
        selectors.push(value)
        styleString += ` ${value.substring(11)} `
      } else {
        if ((value as CssClassName)[IS_CSS_CLASS_NAME]) {
          selectors.push(...(value as CssClassName)[SELECTORS])
          externalClassNames.push(...(value as CssClassName)[EXTERNAL_CLASS_NAMES])
          value = (value as CssClassName)[STYLE_STRING]
          if (value.length > 0) {
            const lastChar = value[value.length - 1]
            if (lastChar !== ';' && lastChar !== '}') {
              value += ';'
            }
          }
        } else if (
          !(value as CssEscapedString).isCssEscaped &&
          /([\\"'\/])/.test(value as string)
        ) {
          value = value.replace(/([\\"']|(?<=<)\/)/g, '\\$1')
        }
        styleString += `${value || ''}`
      }
    }
  }

  return minify(styleString)
}

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
    ...values: CssVariableType[]
  ): Promise<string> => {
    // eslint-disable-next-line @typescript-eslint/ban-types
    const selectors: String[] = []
    const externalClassNames: string[] = []
    const thisStyleString = await buildStyleString(strings, values, selectors, externalClassNames)
    const thisSelector = toHash(thisStyleString)
    const className = new String([thisSelector, ...externalClassNames].join(' ')) as CssClassName

    const appendStyle: HtmlEscapedCallback = ({ buffer, context }): Promise<string> | undefined => {
      const [toAdd, added] = contextMap.get(context) as usedClassNameData
      const names = Object.keys(toAdd)

      if (!names.length) {
        return
      }

      let stylesStr = ''
      names.forEach((className) => {
        added[className] = true
        stylesStr += `${className[0] === '@' ? '' : '.'}${className}{${toAdd[className]}}`
      })
      contextMap.set(context, [{}, added])

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
        contextMap.set(context, [{}, {}])
      }
      const [toAdd, added] = contextMap.get(context) as usedClassNameData
      let allAdded = true
      if (!added[thisSelector]) {
        allAdded = false
        toAdd[thisSelector] = thisStyleString
      }
      selectors.forEach((className) => {
        if (!added[`${className}`]) {
          allAdded = false
          toAdd[`${className}`] = (className as CssClassName)[STYLE_STRING]
        }
      })
      if (allAdded) {
        return
      }

      return Promise.resolve(raw('', [appendStyle]))
    }

    Object.assign(className, {
      isEscaped: true,
      callbacks: [addClassNameToContext],
      [IS_CSS_CLASS_NAME]: true,
      [STYLE_STRING]: thisStyleString,
      [SELECTORS]: selectors,
      [EXTERNAL_CLASS_NAMES]: externalClassNames,
    })

    return className as string
  }

  const cx = async (
    ...args: (string | boolean | null | undefined | Promise<string | boolean | null | undefined>)[]
  ): Promise<string> => {
    const resolvedArgs = await Promise.all(args)
    for (let i = 0; i < resolvedArgs.length; i++) {
      const arg = resolvedArgs[i]
      if (typeof arg === 'string' && !(arg as CssClassName)[IS_CSS_CLASS_NAME]) {
        const externalClassName = new String(arg) as CssClassName
        resolvedArgs[i] = Object.assign(externalClassName, {
          isEscaped: true,
          [IS_CSS_CLASS_NAME]: true,
          [STYLE_STRING]: '',
          [SELECTORS]: [],
          [EXTERNAL_CLASS_NAMES]: [arg],
        })
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return css(Array(resolvedArgs.length).fill('') as any, ...resolvedArgs)
  }

  const keyframes = async (
    strings: TemplateStringsArray,
    ...values: CssVariableType[]
  ): // eslint-disable-next-line @typescript-eslint/ban-types
  Promise<String> => {
    const styleString = await buildStyleString(strings, values, [], [])
    const className = new String(`@keyframes ${toHash(styleString)}`)
    Object.assign(className as CssClassName, {
      isEscaped: true,
      [IS_CSS_CLASS_NAME]: true,
      [STYLE_STRING]: styleString,
      [SELECTORS]: [],
      [EXTERNAL_CLASS_NAMES]: [],
    })
    return className
  }

  const Style = () => raw(`<style id="${id}"></style>`)

  return {
    css,
    cx,
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
 * `cx` is an experimental feature.
 * The API might be changed.
 */
export const cx = defaultContext.cx

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
