import type { Context, Renderer } from '../../context'
import { html, raw } from '../../helper/html'
import { jsx, createContext, useContext, Fragment } from '../../jsx'
import type { FC, JSXNode } from '../../jsx'
import { renderToReadableStream } from '../../jsx/streaming'
import type { Env, Input, MiddlewareHandler } from '../../types'

export const RequestContext = createContext<Context | null>(null)

export type PropsForRenderer = [...Required<Parameters<Renderer>>] extends [unknown, infer Props]
  ? Props
  : unknown

type RendererOptions = {
  docType?: boolean | string
  stream?: boolean | Record<string, string>
}

const createRenderer =
  (c: Context, component?: FC<PropsForRenderer & { Layout: FC }>, options?: RendererOptions) =>
  (children: JSXNode, props: PropsForRenderer) => {
    const docType =
      typeof options?.docType === 'string'
        ? options.docType
        : options?.docType === true
        ? '<!DOCTYPE html>'
        : ''

    const Layout: FC = (props) => {
      const parentLayout = c.getLayout() as FC
      return parentLayout({ ...props, Layout: Fragment })
    }

    const currentLayout = component
      ? component({
          children,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ...{ Layout, ...(props as any) },
        })
      : children

    const body = html`${raw(docType)}${jsx(
      RequestContext.Provider,
      { value: c },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      currentLayout as any
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

export const jsxRenderer = (
  component?: FC<PropsForRenderer & { Layout: FC }>,
  options?: RendererOptions
): MiddlewareHandler =>
  function jsxRenderer(c, next) {
    const parentLayout = c.getLayout()
    if (!parentLayout && component) c.setLayout(component)

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
