import { raw } from '../../helper/html/index.ts'
import { DOM_RENDERER } from '../../jsx/constants.ts'
import { createCssJsxDomObjects } from '../../jsx/dom/css.ts'
import type { HtmlEscapedCallback, HtmlEscapedString } from '../../utils/html.ts'
import type { CssClassName as CssClassNameCommon, CssVariableType } from './common.ts'
import {
  SELECTOR,
  CLASS_NAME,
  STYLE_STRING,
  SELECTORS,
  PSEUDO_GLOBAL_SELECTOR,
  DEFAULT_STYLE_ID,
  cssCommon,
  cxCommon,
  keyframesCommon,
  viewTransitionCommon,
} from './common.ts'
export { rawCssString } from './common.ts'

type CssClassName = HtmlEscapedString & CssClassNameCommon

type usedClassNameData = [
  Record<string, string>, // class name to add
  Record<string, true> // class name already added
]

interface CssType {
  (strings: TemplateStringsArray, ...values: CssVariableType[]): Promise<string>
}

interface CxType {
  (
    ...args: (CssClassName | Promise<string> | string | boolean | null | undefined)[]
  ): Promise<string>
}

interface KeyframesType {
  (strings: TemplateStringsArray, ...values: CssVariableType[]): CssClassNameCommon
}

interface ViewTransitionType {
  (strings: TemplateStringsArray, ...values: CssVariableType[]): Promise<string>
  (content: Promise<string>): Promise<string>
  (): Promise<string>
}

interface StyleType {
  (args?: { children?: Promise<string> }): HtmlEscapedString
}

/**
 * @experimental
 * `createCssContext` is an experimental feature.
 * The API might be changed.
 */
export const createCssContext = ({ id }: { id: Readonly<string> }): DefaultContextType => {
  const [cssJsxDomObject, StyleRenderToDom] = createCssJsxDomObjects({ id })

  const contextMap: WeakMap<object, usedClassNameData> = new WeakMap()

  const replaceStyleRe = new RegExp(`(<style id="${id}">.*?)(</style>)`)

  const newCssClassNameObject = (cssClassName: CssClassNameCommon): Promise<string> => {
    const appendStyle: HtmlEscapedCallback = ({ buffer, context }): Promise<string> | undefined => {
      const [toAdd, added] = contextMap.get(context) as usedClassNameData
      const names = Object.keys(toAdd)

      if (!names.length) {
        return
      }

      let stylesStr = ''
      names.forEach((className) => {
        added[className] = true
        stylesStr += className.startsWith(PSEUDO_GLOBAL_SELECTOR)
          ? toAdd[className]
          : `${className[0] === '@' ? '' : '.'}${className}{${toAdd[className]}}`
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
      if (!added[cssClassName[SELECTOR]]) {
        allAdded = false
        toAdd[cssClassName[SELECTOR]] = cssClassName[STYLE_STRING]
      }
      cssClassName[SELECTORS].forEach(
        ({ [CLASS_NAME]: className, [STYLE_STRING]: styleString }) => {
          if (!added[className]) {
            allAdded = false
            toAdd[className] = styleString
          }
        }
      )
      if (allAdded) {
        return
      }

      return Promise.resolve(raw('', [appendStyle]))
    }

    const className = new String(cssClassName[CLASS_NAME]) as CssClassName
    Object.assign(className, cssClassName)
    ;(className as HtmlEscapedString).isEscaped = true
    ;(className as HtmlEscapedString).callbacks = [addClassNameToContext]
    const promise = Promise.resolve(className)
    Object.assign(promise, cssClassName)
    // eslint-disable-next-line @typescript-eslint/unbound-method
    promise.toString = cssJsxDomObject.toString
    return promise
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

  const keyframes = keyframesCommon

  const viewTransition: ViewTransitionType = ((
    strings: TemplateStringsArray | Promise<string> | undefined,
    ...values: CssVariableType[]
  ) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return newCssClassNameObject(viewTransitionCommon(strings as any, values))
  }) as ViewTransitionType

  const Style: StyleType = ({ children } = {}) =>
    children
      ? raw(`<style id="${id}">${(children as unknown as CssClassName)[STYLE_STRING]}</style>`)
      : raw(`<style id="${id}"></style>`)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(Style as any)[DOM_RENDERER] = StyleRenderToDom

  return {
    css,
    cx,
    keyframes,
    viewTransition: viewTransition as ViewTransitionType,
    Style,
  }
}

interface DefaultContextType {
  css: CssType
  cx: CxType
  keyframes: KeyframesType
  viewTransition: ViewTransitionType
  Style: StyleType
}

const defaultContext: DefaultContextType = createCssContext({
  id: DEFAULT_STYLE_ID,
})

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
