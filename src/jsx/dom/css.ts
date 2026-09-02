/**
 * @module
 * This module provides APIs that enable `hono/jsx/dom` to support.
 */

import type { FC, PropsWithChildren } from '../'
import type {
  ClassNameSlug,
  CssClassName,
  CssVariableType,
  OnInvalidSlug,
} from '../../helper/css/common'
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

// Scans forward from a quote character and returns the index of the character
// after the closing (matching, escaped-aware) quote so that quoted snippets are
// skipped as a unit.
const skipQuotedContent = (rule: string, i: number): number => {
  const quote = rule[i]
  let j = i + 1
  for (; j < rule.length; j++) {
    if (rule[j] === '\\') {
      j++
      continue
    }
    if (rule[j] === quote) {
      break
    }
  }
  return j
}

// Splits a rule into balanced top-level blocks (e.g. nested keyframes). Braces
// are tracked by depth, and each block that returns to depth 0 is pushed.
const splitRule = (rule: string): string[] => {
  const result: string[] = []
  let startPos = 0
  let depth = 0
  for (let i = 0, len = rule.length; i < len; i++) {
    const char = rule[i]

    // consume quote
    if (char === "'" || char === '"') {
      i = skipQuotedContent(rule, i)
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
    FC<PropsWithChildren<void>>,
  ]
}

// Locates the style sheet whose id matches the given one and inserts CSS rules
// into it, avoiding duplicates and deferring work until the sheet is present.
const createCssRuleInserter = (
  id: string
): ((className: string, styleString: string) => void) => {
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

  return insertRule
}

export const createCssJsxDomObjects: CreateCssJsxDomObjectsType = ({ id }) => {
  const insertRule = createCssRuleInserter(id)

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
    }) as any

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
 *
 * @param options.id - The ID for the style element
 * @param options.classNameSlug - Optional function to customize generated CSS class names
 * @param options.onInvalidSlug - Optional callback function called when an invalid slug is returned from ClassNameSlug
 */
export const createCssContext = ({
  id,
  classNameSlug,
  onInvalidSlug,
}: {
  id: Readonly<string>
  classNameSlug?: ClassNameSlug
  onInvalidSlug?: OnInvalidSlug
}): DefaultContextType => {
  const [cssObject, Style] = createCssJsxDomObjects({ id })

  const newCssClassNameObject = (cssClassName: CssClassName): string => {
    cssClassName.toString = cssObject.toString
    return cssClassName as unknown as string
  }

  const css: CssType = (strings, ...values) => {
    return newCssClassNameObject(cssCommon(strings, values, classNameSlug, onInvalidSlug))
  }

  const cx: CxType = (...args) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    args = cxCommon(args as any) as any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return css(Array(args.length).fill('') as any, ...args)
  }

  const keyframes: KeyframesType = (strings, ...values) =>
    keyframesCommon(strings, values, classNameSlug, onInvalidSlug)

  const viewTransition: ViewTransitionType = ((
    strings: TemplateStringsArray | string | undefined,
    ...values: CssVariableType[]
  ) => {
    return newCssClassNameObject(
      viewTransitionCommon(strings as any, values, classNameSlug, onInvalidSlug) // eslint-disable-line @typescript-eslint/no-explicit-any
    )
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
