/**
 * @module
 * JSX Renderer Middleware for Hono.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Context, PropsForRenderer } from '../../context'
import { html, raw } from '../../helper/html'
import { Fragment, createContext, jsx, useContext } from '../../jsx'
import type { FC, Context as JSXContext, JSXNode, PropsWithChildren } from '../../jsx'
import { renderToReadableStream } from '../../jsx/streaming'
import type { Env, Input, MiddlewareHandler } from '../../types'
import type { HtmlEscapedString } from '../../utils/html'

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
            Layout,
            ...(props as any),
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
        c.header('Content-Encoding', 'Identity')
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

/**
 * JSX Renderer Middleware for hono.
 *
 * @see {@link https://hono.dev/docs/middleware/builtin/jsx-renderer}
 *
 * @param {ComponentWithChildren} [component] - The component to render, which can accept children and props.
 * @param {RendererOptions} [options] - The options for the JSX renderer middleware.
 * @param {boolean | string} [options.docType=true] - The DOCTYPE to be added at the beginning of the HTML. If set to false, no DOCTYPE will be added.
 * @param {boolean | Record<string, string>} [options.stream=false] - If set to true, enables streaming response with default headers. If a record is provided, custom headers will be used.
 * @returns {MiddlewareHandler} The middleware handler function.
 *
 * @example
 * ```ts
 * const app = new Hono()
 *
 * app.get(
 *   '/page/*',
 *   jsxRenderer(({ children }) => {
 *     return (
 *       <html>
 *         <body>
 *           <header>Menu</header>
 *           <div>{children}</div>
 *         </body>
 *       </html>
 *     )
 *   })
 * )
 *
 * app.get('/page/about', (c) => {
 *   return c.render(<h1>About me!</h1>)
 * })
 * ```
 */
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

/**
 * useRequestContext for Hono.
 *
 * @template E - The environment type.
 * @template P - The parameter type.
 * @template I - The input type.
 * @returns {Context<E, P, I>} An instance of Context.
 *
 * @example
 * ```ts
 * const RequestUrlBadge: FC = () => {
 *   const c = useRequestContext()
 *   return <b>{c.req.url}</b>
 * }
 *
 * app.get('/page/info', (c) => {
 *   return c.render(
 *     <div>
 *       You are accessing: <RequestUrlBadge />
 *     </div>
 *   )
 * })
 * ```
 */
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
