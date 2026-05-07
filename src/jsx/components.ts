import { raw } from '../helper/html'
import type { HtmlEscapedCallback, HtmlEscapedString } from '../utils/html'
import { HtmlEscapedCallbackPhase, resolveCallback } from '../utils/html'
import { jsx, Fragment } from './base'
import { DOM_RENDERER } from './constants'
import { useContext } from './context'
import { ErrorBoundary as ErrorBoundaryDomRenderer } from './dom/components'
import type { HasRenderToDom } from './dom/render'
import { StreamingContext } from './streaming'
import type { Child, FC, PropsWithChildren } from './'

let errorBoundaryCounter = 0

export const childrenToString = async (children: Child[]): Promise<HtmlEscapedString[]> => {
  try {
    return children
      .flat()
      .map((c) => (c == null || typeof c === 'boolean' ? '' : c.toString())) as HtmlEscapedString[]
  } catch (e) {
    if (e instanceof Promise) {
      await e
      return childrenToString(children)
    } else {
      throw e
    }
  }
}

const resolveChildEarly = (c: Child): HtmlEscapedString | Promise<HtmlEscapedString> => {
  if (c == null || typeof c === 'boolean') {
    return '' as HtmlEscapedString
  } else if (typeof c === 'string') {
    return c as HtmlEscapedString
  } else {
    const str = c.toString()
    if (!(str instanceof Promise)) {
      return raw(str)
    } else {
      return str as Promise<HtmlEscapedString>
    }
  }
}

export type ErrorHandler = (error: Error) => void
export type FallbackRender = (error: Error) => Child

/**
 * @experimental
 * `ErrorBoundary` is an experimental feature.
 * The API might be changed.
 */
export const ErrorBoundary: FC<
  PropsWithChildren<{
    fallback?: Child
    fallbackRender?: FallbackRender
    onError?: ErrorHandler
  }>
> = async ({ children, fallback, fallbackRender, onError }) => {
  if (!children) {
    return raw('')
  }

  if (!Array.isArray(children)) {
    children = [children]
  }

  const nonce = useContext(StreamingContext)?.scriptNonce

  let fallbackStr: string | undefined
  const resolveFallbackStr = async () => {
    const awaitedFallback = await fallback
    if (typeof awaitedFallback === 'string') {
      fallbackStr = awaitedFallback
    } else {
      fallbackStr = await awaitedFallback?.toString()
      if (typeof fallbackStr === 'string') {
        // should not apply `raw` if fallbackStr is undefined, null, or boolean
        fallbackStr = raw(fallbackStr)
      }
    }
  }
  const fallbackRes = (error: Error): HtmlEscapedString | Promise<HtmlEscapedString> => {
    onError?.(error)
    return (fallbackStr ||
      (fallbackRender && jsx(Fragment, {}, fallbackRender(error) as HtmlEscapedString)) ||
      '') as HtmlEscapedString
  }
  let resArray: HtmlEscapedString[] | Promise<HtmlEscapedString[]>[] = []
  try {
    resArray = children.map(resolveChildEarly) as unknown as HtmlEscapedString[]
  } catch (e) {
    await resolveFallbackStr()
    if (e instanceof Promise) {
      resArray = [
        e.then(() => childrenToString(children as Child[])).catch((e) => fallbackRes(e)),
      ] as Promise<HtmlEscapedString[]>[]
    } else {
      resArray = [fallbackRes(e as Error) as HtmlEscapedString]
    }
  }

  if (resArray.some((res) => (res as {}) instanceof Promise)) {
    await resolveFallbackStr()
    const index = errorBoundaryCounter++
    const replaceRe = RegExp(`(<template id="E:${index}"></template>.*?)(.*?)(<!--E:${index}-->)`)
    const caught = false
    const catchCallback = async ({ error, buffer }: { error: Error; buffer?: [string] }) => {
      if (caught) {
        return ''
      }

      const fallbackResString = await Fragment({
        children: fallbackRes(error),
      }).toString()
      if (buffer) {
        buffer[0] = buffer[0].replace(replaceRe, fallbackResString)
      }
      return buffer
        ? ''
        : `<template data-hono-target="E:${index}">${fallbackResString}</template><script>
((d,c,n) => {
c=d.currentScript.previousSibling
d=d.getElementById('E:${index}')
if(!d)return
do{n=d.nextSibling;n.remove()}while(n.nodeType!=8||n.nodeValue!='E:${index}')
d.replaceWith(c.content)
})(document)
</script>`
    }

    let error: unknown
    const promiseAll = Promise.all(resArray).catch((e) => (error = e))
    return raw(`<template id="E:${index}"></template><!--E:${index}-->`, [
      ({ phase, buffer, context }) => {
        if (phase === HtmlEscapedCallbackPhase.BeforeStream) {
          return
        }
        return promiseAll
          .then(async (htmlArray: HtmlEscapedString[]) => {
            if (error) {
              throw error
            }
            htmlArray = htmlArray.flat()
            const content = htmlArray.join('')
            let html = buffer
              ? ''
              : `<template data-hono-target="E:${index}">${content}</template><script${
                  nonce ? ` nonce="${nonce}"` : ''
                }>
((d,c) => {
c=d.currentScript.previousSibling
d=d.getElementById('E:${index}')
if(!d)return
d.parentElement.insertBefore(c.content,d.nextSibling)
})(document)
</script>`

            if (htmlArray.every((html) => !(html as HtmlEscapedString).callbacks?.length)) {
              if (buffer) {
                buffer[0] = buffer[0].replace(replaceRe, content)
              }
              return html
            }

            if (buffer) {
              buffer[0] = buffer[0].replace(
                replaceRe,
                (_all, pre, _, post) => `${pre}${content}${post}`
              )
            }

            const callbacks = htmlArray
              .map((html) => (html as HtmlEscapedString).callbacks || [])
              .flat()

            if (phase === HtmlEscapedCallbackPhase.Stream) {
              html = await resolveCallback(
                html,
                HtmlEscapedCallbackPhase.BeforeStream,
                true,
                context
              )
            }

            let resolvedCount = 0
            const promises = callbacks.map<HtmlEscapedCallback>(
              (c) =>
                (...args) =>
                  c(...args)
                    ?.then((content) => {
                      resolvedCount++

                      if (buffer) {
                        if (resolvedCount === callbacks.length) {
                          buffer[0] = buffer[0].replace(replaceRe, (_all, _pre, content) => content)
                        }
                        buffer[0] += content
                        return raw('', (content as HtmlEscapedString).callbacks)
                      }

                      return raw(
                        content +
                          (resolvedCount !== callbacks.length
                            ? ''
                            : `<script>
((d,c,n) => {
d=d.getElementById('E:${index}')
if(!d)return
n=d.nextSibling
while(n.nodeType!=8||n.nodeValue!='E:${index}'){n=n.nextSibling}
n.remove()
d.remove()
})(document)
</script>`),
                        (content as HtmlEscapedString).callbacks
                      )
                    })
                    .catch((error) => catchCallback({ error, buffer }))
            )

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return raw(html, promises as any)
          })
          .catch((error) => catchCallback({ error, buffer }))
      },
    ])
  } else {
    return Fragment({ children: resArray as Child[] })
  }
}
;(ErrorBoundary as HasRenderToDom)[DOM_RENDERER] = ErrorBoundaryDomRenderer
