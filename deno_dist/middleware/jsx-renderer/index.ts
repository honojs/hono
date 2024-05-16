/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Context, PropsForRenderer } from '../../context.ts'
import { html, raw } from '../../helper/html/index.ts'
import { jsx, createContext, useContext, Fragment } from '../../jsx/index.ts'
import type { FC, PropsWithChildren, JSXNode } from '../../jsx/index.ts'
import type { Context as JSXContext } from '../../jsx/index.ts'
import { renderToReadableStream } from '../../jsx/streaming.ts'
import type { Env, Input, MiddlewareHandler } from '../../types.ts'
import type { HtmlEscapedString } from '../../utils/html.ts'

export const RequestContext: JSXContext<Context<any, any, {}> | null> =
  createContext<Context | null>(null)

type RendererOptions = {
  docType?: boolean | string
  stream?: boolean | Record<string, string>
}

type Component = (
  props: PropsForRenderer & { Layout: FC },
  c: Context
) => HtmlEscapedString | Promise<HtmlEscapedString>

type ComponentWithChildren = (
  props: PropsWithChildren<PropsForRenderer & { Layout: FC }>,
  c: Context
) => HtmlEscapedString | Promise<HtmlEscapedString>

const createRenderer =
  (c: Context, Layout: FC, component?: Component, options?: RendererOptions) =>
  (children: JSXNode, props: PropsForRenderer) => {
    const docType =
      typeof options?.docType === 'string'
        ? options.docType
        : options?.docType === false
        ? ''
        : '<!DOCTYPE html>'

    const currentLayout = component
      ? jsx(
          (props: any) => component(props, c),
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

    if (options?.stream) {
      if (options.stream === true) {
        c.header('Transfer-Encoding', 'chunked')
        c.header('Content-Type', 'text/html; charset=UTF-8')
      } else {
        for (const [key, value] of Object.entries(options.stream)) {
          c.header(key, value)
        }
      }
      return c.body(renderToReadableStream(body))
    } else {
      return c.html(body)
    }
  }

export const jsxRenderer = (
  component?: ComponentWithChildren,
  options?: RendererOptions
): MiddlewareHandler =>
  function jsxRenderer(c, next) {
    const Layout = (c.getLayout() ?? Fragment) as FC
    if (component) {
      c.setLayout((props) => {
        return component({ ...props, Layout }, c)
      })
    }
    c.setRenderer(createRenderer(c, Layout, component, options) as any)
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
