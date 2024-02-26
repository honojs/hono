/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Context, PropsForRenderer } from '../../context'
import { html, raw } from '../../helper/html'
import { jsx, createContext, useContext, Fragment } from '../../jsx'
import type { FC, PropsWithChildren, JSXNode } from '../../jsx'
import { renderToReadableStream } from '../../jsx/streaming'
import type { Env, Input, MiddlewareHandler } from '../../types'

export const RequestContext = createContext<Context | null>(null)

type RendererOptions = {
  docType?: boolean | string
  stream?: boolean | Record<string, string>
}

const createRenderer =
  (
    c: Context,
    Layout: FC,
    component?: FC<PropsForRenderer & { Layout: FC }>,
    options?: RendererOptions
  ) =>
  (children: JSXNode, props: PropsForRenderer) => {
    const docType =
      typeof options?.docType === 'string'
        ? options.docType
        : options?.docType === false
        ? ''
        : '<!DOCTYPE html>'

    /* eslint-disable @typescript-eslint/no-explicit-any */
    const currentLayout = component
      ? jsx(
          component,
          {
            ...{ Layout, ...(props as any) },
          },
          children as any
        )
      : children

    const body = html`${raw(docType)}${jsx(
      RequestContext.Provider,
      { value: c },
      currentLayout as any
    )}`
    /* eslint-enable @typescript-eslint/no-explicit-any */

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
  component?: FC<PropsWithChildren<PropsForRenderer & { Layout: FC }>>,
  options?: RendererOptions
): MiddlewareHandler =>
  function jsxRenderer(c, next) {
    const Layout = (c.getLayout() ?? Fragment) as FC
    if (component) {
      c.setLayout((props) => {
        return component({ ...props, Layout })
      })
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    c.setRenderer(createRenderer(c, Layout, component, options) as any)
    return next()
  }

export const useRequestContext = <
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  E extends Env = any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  P extends string = any,
  I extends Input = {}
>(): Context<E, P, I> => {
  const c = useContext(RequestContext)
  if (!c) {
    throw new Error('RequestContext is not provided.')
  }
  return c
}
