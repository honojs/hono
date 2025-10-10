/**
 * @module
 * This module provides APIs that enable `hono/jsx/dom` to support.
 */

import type { FC, PropsWithChildren } from '../'
import type { CssClassName, CssVariableType } from '../../helper/css/common'
import {
  CLASS_NAME,
  DEFAULT_STYLE_ID,
  PSEUDO_GLOBAL_SELECTOR,
  SELECTOR,
  SELECTORS,
  STYLE_STRING,
  cssCommon,
  cxCommon,
  keyframesCommon,
  viewTransitionCommon,
} from '../../helper/css/common'
export { rawCssString } from '../../helper/css/common'

const splitRule = (rule: string): string[] => {
  const result: string[] = []
  let startPos = 0
  let depth = 0
  for (let i = 0, len = rule.length; i < len; i++) {
    const char = rule[i]

    // consume quote

    if (char === "'" || char === '"') {
      const quote = char
      i++
      for (; i < len; i++) {
        if (rule[i] === '\\') {
          i++
          continue
        }
        if (rule[i] === quote) {
          break
        }
      }
      continue
    }

    // comments are removed from the rule in advance
    if (char === '{') {
      depth++
      continue
    }
    if (char === '}') {
      depth--
      if (depth === 0) {
        result.push(rule.slice(startPos, i + 1))
        startPos = i + 1
      }
      continue
    }
  }
  return result
}

interface CreateCssJsxDomObjectsType {
  (args: { id: Readonly<string> }): readonly [
    {
      toString(this: CssClassName): string
    },
    FC<PropsWithChildren<void>>
  ]
}

export const createCssJsxDomObjects: CreateCssJsxDomObjectsType = ({ id }) => {
  let styleSheet: CSSStyleSheet | null | undefined = undefined
  const findStyleSheet = (): [CSSStyleSheet, Set<string>] | [] => {
    if (!styleSheet) {
      styleSheet = document.querySelector<HTMLStyleElement>(`style#${id}`)
        ?.sheet as CSSStyleSheet | null
      if (styleSheet) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(styleSheet as any).addedStyles = new Set<string>()
      }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return styleSheet ? [styleSheet, (styleSheet as any).addedStyles] : []
  }

  const insertRule = (className: string, styleString: string) => {
    const [sheet, addedStyles] = findStyleSheet()
    if (!sheet || !addedStyles) {
      Promise.resolve().then(() => {
        if (!findStyleSheet()[0]) {
          throw new Error('style sheet not found')
        }
        insertRule(className, styleString)
      })
      return
    }

    if (!addedStyles.has(className)) {
      addedStyles.add(className)
      ;(className.startsWith(PSEUDO_GLOBAL_SELECTOR)
        ? splitRule(styleString)
        : [`${className[0] === '@' ? '' : '.'}${className}{${styleString}}`]
      ).forEach((rule) => {
        sheet.insertRule(rule, sheet.cssRules.length)
      })
    }
  }

  const cssObject = {
    toString(this: CssClassName): string {
      const selector = this[SELECTOR]
      insertRule(selector, this[STYLE_STRING])
      this[SELECTORS].forEach(({ [CLASS_NAME]: className, [STYLE_STRING]: styleString }) => {
        insertRule(className, styleString)
      })

      return this[CLASS_NAME]
    },
  }

  const Style: FC<PropsWithChildren<{ nonce?: string }>> = ({ children, nonce }) =>
    ({
      tag: 'style',
      props: {
        id,
        nonce,
        children:
          children &&
          (Array.isArray(children) ? children : [children]).map(
            (c) => (c as unknown as CssClassName)[STYLE_STRING]
          ),
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

  return [cssObject, Style] as const
}

interface CssType {
  (strings: TemplateStringsArray, ...values: CssVariableType[]): string
}

interface CxType {
  (...args: (string | boolean | null | undefined)[]): string
}

interface KeyframesType {
  (strings: TemplateStringsArray, ...values: CssVariableType[]): CssClassName
}

interface ViewTransitionType {
  (strings: TemplateStringsArray, ...values: CssVariableType[]): string
  (content: string): string
  (): string
}

interface DefaultContextType {
  css: CssType
  cx: CxType
  keyframes: KeyframesType
  viewTransition: ViewTransitionType
  Style: FC<PropsWithChildren<void>>
}

/**
 * @experimental
 * `createCssContext` is an experimental feature.
 * The API might be changed.
 */
export const createCssContext = ({ id }: { id: Readonly<string> }): DefaultContextType => {
  const [cssObject, Style] = createCssJsxDomObjects({ id })

  const newCssClassNameObject = (cssClassName: CssClassName): string => {
    cssClassName.toString = cssObject.toString
    return cssClassName as unknown as string
  }

  const css: CssType = (strings, ...values) => {
    return newCssClassNameObject(cssCommon(strings, values))
  }

  const cx: CxType = (...args) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    args = cxCommon(args as any) as any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return css(Array(args.length).fill('') as any, ...args)
  }

  const keyframes: KeyframesType = keyframesCommon

  const viewTransition: ViewTransitionType = ((
    strings: TemplateStringsArray | string | undefined,
    ...values: CssVariableType[]
  ) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return newCssClassNameObject(viewTransitionCommon(strings as any, values))
  }) as ViewTransitionType

  return {
    css,
    cx,
    keyframes,
    viewTransition,
    Style,
  }
}

const defaultContext: DefaultContextType = createCssContext({ id: DEFAULT_STYLE_ID })

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
 * `viewTransition` is an experimental feature.
 * The API might be changed.
 */
export const viewTransition = defaultContext.viewTransition

/**
 * @experimental
 * `Style` is an experimental feature.
 * The API might be changed.
 */
export const Style = defaultContext.Style
