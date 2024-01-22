// provide utility functions for css helper both on server and client
export const PSEUDO_GLOBAL_SELECTOR = ':-hono-global'
export const isPseudoGlobalSelectorRe = new RegExp(`^${PSEUDO_GLOBAL_SELECTOR}{(.*)}$`)
export const DEFAULT_STYLE_ID = 'hono-css'

export const SELECTOR = Symbol()
export const CLASS_NAME = Symbol()
export const STYLE_STRING = Symbol()
export const SELECTORS = Symbol()
export const EXTERNAL_CLASS_NAMES = Symbol()
const CSS_ESCAPED = Symbol()

export interface CssClassName {
  [SELECTOR]: string
  [CLASS_NAME]: string
  [STYLE_STRING]: string
  [SELECTORS]: CssClassName[]
  [EXTERNAL_CLASS_NAMES]: string[]
}

export const IS_CSS_ESCAPED = Symbol()

interface CssEscapedString {
  [CSS_ESCAPED]: string
}

/**
 * @experimental
 * `rawCssString` is an experimental feature.
 * The API might be changed.
 */
export const rawCssString = (value: string): CssEscapedString => {
  return {
    [CSS_ESCAPED]: value,
  }
}

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

    '\\s*;\\s*(}|$)\\s*', // $2: trailing semicolon
    '\\s*([{};:,])\\s*', // $3: whitespace around { } : , ;
    '(\\s)\\s+', // $4: 2+ spaces
  ].join('|'),
  'g'
)

export const minify = (css: string): string => {
  return css.replace(minifyCssRe, (_, $1, $2, $3, $4) => $1 || $2 || $3 || $4 || '')
}

type CssVariableBasicType =
  | CssClassName
  | CssEscapedString
  | string
  | number
  | boolean
  | null
  | undefined
type CssVariableAsyncType = Promise<CssVariableBasicType>
type CssVariableArrayType = (CssVariableBasicType | CssVariableAsyncType)[]
export type CssVariableType = CssVariableBasicType | CssVariableAsyncType | CssVariableArrayType

export const buildStyleString = (
  strings: TemplateStringsArray,
  values: CssVariableType[]
): [string, string, CssClassName[], string[]] => {
  const selectors: CssClassName[] = []
  const externalClassNames: string[] = []

  const label = strings[0].match(/^\s*\/\*(.*?)\*\//)?.[1] || ''
  let styleString = ''
  for (let i = 0, len = strings.length; i < len; i++) {
    styleString += strings[i]
    let vArray = values[i]
    if (typeof vArray === 'boolean' || vArray === null || vArray === undefined) {
      continue
    }

    if (!Array.isArray(vArray)) {
      vArray = [vArray]
    }
    for (let j = 0, len = vArray.length; j < len; j++) {
      let value = vArray[j]
      if (typeof value === 'boolean' || value === null || value === undefined) {
        continue
      }
      if (typeof value === 'string') {
        if (/([\\"'\/])/.test(value)) {
          styleString += value.replace(/([\\"']|(?<=<)\/)/g, '\\$1')
        } else {
          styleString += value
        }
      } else if (typeof value === 'number') {
        styleString += value
      } else if ((value as CssEscapedString)[CSS_ESCAPED]) {
        styleString += (value as CssEscapedString)[CSS_ESCAPED]
      } else if ((value as CssClassName)[CLASS_NAME].startsWith('@keyframes ')) {
        selectors.push(value as CssClassName)
        styleString += ` ${(value as CssClassName)[CLASS_NAME].substring(11)} `
      } else {
        if (strings[i + 1]?.match(/^\s*{/)) {
          // assume this value is a class name
          selectors.push(value as CssClassName)
          value = `.${(value as CssClassName)[CLASS_NAME]}`
        } else {
          selectors.push(...(value as CssClassName)[SELECTORS])
          externalClassNames.push(...(value as CssClassName)[EXTERNAL_CLASS_NAMES])
          value = (value as CssClassName)[STYLE_STRING]
          const valueLen = value.length
          if (valueLen > 0) {
            const lastChar = value[valueLen - 1]
            if (lastChar !== ';' && lastChar !== '}') {
              value += ';'
            }
          }
        }
        styleString += `${value || ''}`
      }
    }
  }

  return [label, minify(styleString), selectors, externalClassNames]
}

export const cssCommon = (
  strings: TemplateStringsArray,
  values: CssVariableType[]
): CssClassName => {
  let [label, thisStyleString, selectors, externalClassNames] = buildStyleString(strings, values)
  const isPseudoGlobal = isPseudoGlobalSelectorRe.exec(thisStyleString)
  if (isPseudoGlobal) {
    thisStyleString = isPseudoGlobal[1]
  }
  const selector = (isPseudoGlobal ? PSEUDO_GLOBAL_SELECTOR : '') + toHash(label + thisStyleString)
  const className = (
    isPseudoGlobal ? selectors.map((s) => s[CLASS_NAME]) : [selector, ...externalClassNames]
  ).join(' ')

  return {
    [SELECTOR]: selector,
    [CLASS_NAME]: className,
    [STYLE_STRING]: thisStyleString,
    [SELECTORS]: selectors,
    [EXTERNAL_CLASS_NAMES]: externalClassNames,
  }
}

export const cxCommon = (
  args: (string | boolean | null | undefined | CssClassName)[]
): (string | boolean | null | undefined | CssClassName)[] => {
  for (let i = 0, len = args.length; i < len; i++) {
    const arg = args[i]
    if (typeof arg === 'string') {
      args[i] = {
        [SELECTOR]: '',
        [CLASS_NAME]: '',
        [STYLE_STRING]: '',
        [SELECTORS]: [],
        [EXTERNAL_CLASS_NAMES]: [arg],
      }
    }
  }

  return args
}

export const keyframesCommon = (
  strings: TemplateStringsArray,
  ...values: CssVariableType[]
): CssClassName => {
  const [label, styleString] = buildStyleString(strings, values)
  return {
    [SELECTOR]: '',
    [CLASS_NAME]: `@keyframes ${toHash(label + styleString)}`,
    [STYLE_STRING]: styleString,
    [SELECTORS]: [],
    [EXTERNAL_CLASS_NAMES]: [],
  }
}

type ViewTransitionType = {
  (strings: TemplateStringsArray, values: CssVariableType[]): CssClassName
  (content: CssClassName): CssClassName
  (): CssClassName
}

let viewTransitionNameIndex = 0
export const viewTransitionCommon: ViewTransitionType = ((
  strings: TemplateStringsArray | CssClassName | undefined,
  values: CssVariableType[]
): CssClassName => {
  if (!strings) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    strings = [`/* h-v-t ${viewTransitionNameIndex++} */`] as any
  }
  const content = Array.isArray(strings)
    ? cssCommon(strings as TemplateStringsArray, values)
    : (strings as CssClassName)

  const transitionName = content[CLASS_NAME]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res = cssCommon(['view-transition-name:', ''] as any, [transitionName])

  content[CLASS_NAME] = PSEUDO_GLOBAL_SELECTOR + content[CLASS_NAME]
  content[STYLE_STRING] = content[STYLE_STRING].replace(
    /(?<=::view-transition(?:[a-z-]*)\()(?=\))/g,
    transitionName
  )
  res[CLASS_NAME] = res[SELECTOR] = transitionName
  res[SELECTORS] = [...content[SELECTORS], content]

  return res
}) as ViewTransitionType
