import type { Context, Renderer } from '../../context.ts'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { html, raw } from '../../helper/html/index.ts'
import { jsx, createContext, useContext } from '../../jsx/index.ts'
import type { FC, JSXNode } from '../../jsx/index.ts'
import { renderToReadableStream } from '../../jsx/streaming.ts'
import type { Env, Input, MiddlewareHandler } from '../../types.ts'

export const RequestContext = createContext<Context | null>(null)

type PropsForRenderer = [...Required<Parameters<Renderer>>] extends [unknown, infer Props]
  ? Props
  : unknown

type RendererOptions = {
  docType?: boolean | string
  stream?: boolean | Record<string, string>
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
    const body = html`${raw(docType)}${jsx(
      RequestContext.Provider,
      { value: c },
      (component ? component({ children, ...(props || {}) }) : children) as any
    )}`

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

export const jsxRenderer =
  (component?: FC<PropsForRenderer>, options?: RendererOptions): MiddlewareHandler =>
  (c, next) => {
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
