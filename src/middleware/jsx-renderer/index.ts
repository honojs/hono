import type { Context, Renderer } from '../../context'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { html, raw } from '../../helper/html'
import { jsx, createContext, useContext } from '../../jsx'
import type { FC, JSXNode } from '../../jsx'
import { renderToReadableStream } from '../../jsx/streaming'
import type { Env, Input, MiddlewareHandler } from '../../types'

export const RequestContext = createContext<Context | null>(null)

type PropsForRenderer = [...Required<Parameters<Renderer>>] extends [unknown, infer Props]
  ? Props
  : unknown

type RendererOptions = {
  docType?: boolean | string
  stream?: boolean | Record<string, string>
}

let finalize = () => {}
const finalizePromise = new Promise<void>((resolve) => (finalize = resolve))
const stylesVariableName = '__styles'
const toHash = (str: string): string => {
  let i = 0,
    out = 11
  while (i < str.length) {
    out = (101 * out + str.charCodeAt(i++)) >>> 0
  }
  return 'css-' + out
}

const createRenderer =
  (c: Context, component?: FC<PropsForRenderer>, options?: RendererOptions) =>
  (children: JSXNode, props: PropsForRenderer) => {
    const docType =
      typeof options?.docType === 'string'
        ? options.docType
        : options?.docType === true
        ? '<!DOCTYPE html>'
        : ''
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const template = jsx(
      RequestContext.Provider,
      { value: c },
      (component
        ? (component({ children: children, ...(props || {}) }) as unknown as JSXNode)
            .on('renderToString.css', ({ setContent }) => {
              setContent(
                finalizePromise.then(() => {
                  return `<style>${Object.entries(c.get(stylesVariableName))
                    .map(([className, style]) => {
                      return `.${className} { ${style} }`
                    })
                    .join()}</style>`
                })
              )
            })
            .on('afterRenderToString.html', finalize)
        : children) as any
    )

    const body = html`${raw(docType)}${template}`

    if (options?.stream) {
      return c.body(renderToReadableStream(body), {
        headers:
          options.stream === true
            ? {
                'Transfer-Encoding': 'chunked',
                'Content-Type': 'text/html; charset=UTF-8',
              }
            : options.stream,
      })
    } else {
      return c.html(body)
    }
  }

export const jsxRenderer = (
  component?: FC<PropsForRenderer>,
  options?: RendererOptions
): MiddlewareHandler =>
  function jsxRenderer(c, next) {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    c.setRenderer(createRenderer(c, component, options) as any)
    return next()
  }

export const useRequestContext = <
  E extends Env = any,
  P extends string = any,
  I extends Input = {}
>(): Context<E, P, I> => {
  const c = useContext(RequestContext)
  if (!c) {
    throw new Error('RequestContext is not provided.')
  }
  return c
}

export const css = (strings: TemplateStringsArray, ...values: string[]): string => {
  const c = useRequestContext()

  let styleString = ''
  strings.forEach((string, index) => {
    string = string.trim().replace(/\n\s*/g, ' ')
    styleString += string + (values[index] || '')
  })

  const className = toHash(styleString)

  if (!c.get(stylesVariableName)) {
    c.set(stylesVariableName, {})
  }
  if (!c.get(stylesVariableName)[className]) {
    c.get(stylesVariableName)[className] = styleString.trim()
  }

  return className
}
