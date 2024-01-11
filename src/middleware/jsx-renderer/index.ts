import type { Context, Renderer } from '../../context'
import { html, raw } from '../../helper/html'
import { jsx, createContext, useContext } from '../../jsx'
import type { FC, JSXNode } from '../../jsx'
import { renderToReadableStream } from '../../jsx/streaming'
import type { Env, Input, MiddlewareHandler } from '../../types'

const SPA_CONTENT_REQUEST_QUERY = '__spa_content'
const SPA_ROOT_ID = '__root'
const SPA_CLIENT_SCRIPT = `async function mountContent(pathname) {
  const res = await fetch(pathname + '?${SPA_CONTENT_REQUEST_QUERY}')
  const content = await res.text()
  const root = document.querySelector('#${SPA_ROOT_ID}')
  root.innerHTML = content
}
window.addEventListener(
  'click',
  (e) => {
    if ((e.target).tagName !== 'A') {
      return
    }
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
      return
    }
    const href = (e.target).getAttribute('href')
    if (!href.startsWith('/')) {
      return
    }
    e.preventDefault()
    window.history.pushState(null, null, href)
    mountContent(href)
  },
  true
)
`

export const RequestContext = createContext<Context | null>(null)

type PropsForRenderer = [...Required<Parameters<Renderer>>] extends [unknown, infer Props]
  ? Props
  : unknown

type RendererOptions = {
  docType?: boolean | string
  stream?: boolean | Record<string, string>
  spa?: boolean
}

const createRenderer =
  (c: Context, component?: FC<PropsForRenderer>, options?: RendererOptions) =>
  (children: JSXNode, props: PropsForRenderer) => {
    if (options?.spa) {
      if (c.req.query(SPA_CONTENT_REQUEST_QUERY) !== undefined) {
        return c.html(children)
      }
      children = jsx('hono-spa', { id: SPA_ROOT_ID }, children)
    }

    const docType =
      typeof options?.docType === 'string'
        ? options.docType
        : options?.docType === true
        ? '<!DOCTYPE html>'
        : ''
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const body = html`${raw(docType)}${jsx(
      RequestContext.Provider,
      { value: c },
      (component ? component({ children, ...(props || {}) }) : children) as any
    )}${options?.spa ? raw(`<script>${SPA_CLIENT_SCRIPT}</script>`) : ''}`

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
