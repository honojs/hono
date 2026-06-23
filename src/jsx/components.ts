import { raw } from '../helper/html'
import type { HtmlEscapedCallback, HtmlEscapedString } from '../utils/html'
import { HtmlEscapedCallbackPhase, resolveCallback } from '../utils/html'
import { jsx, Fragment } from './base'
import { DOM_RENDERER } from './constants'
import { captureRenderContext, useContext } from './context'
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
      // Capture before `await`: on the fallback path the render context is
      // only observable during this synchronous window.
      const resume = captureRenderContext()
      await e
      return resume(() => childrenToString(children))
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

  let resume: ReturnType<typeof captureRenderContext> | undefined
  const getResume = () => (resume ||= captureRenderContext())

  let fallbackStrPromise: Promise<HtmlEscapedString | string | undefined> | undefined
  const resolveFallbackStr = (): Promise<HtmlEscapedString | string | undefined> =>
    (fallbackStrPromise ||= (async () => {
      const awaitedFallback = await fallback
      if (typeof awaitedFallback === 'string') {
        return awaitedFallback
      } else {
        const fallbackResult = await getResume()(() => awaitedFallback?.toString())
        if (typeof fallbackResult === 'string') {
          // Don't apply `raw` to undefined/null/boolean. Preserve callbacks from
          // the stringified result, or the original thenable for plain strings.
          return raw(
            fallbackResult,
            (fallbackResult as HtmlEscapedString).callbacks ||
              (awaitedFallback as HtmlEscapedString)?.callbacks
          )
        }
      }
    })())
  const renderFallback = async (error: Error): Promise<HtmlEscapedString> => {
    const fallbackStr = await resolveFallbackStr()
    return getResume()(async () => {
      onError?.(error)
      const fallbackRes = (
        fallbackStr !== undefined
          ? fallbackStr
          : (fallbackRender && jsx(Fragment, {}, fallbackRender(error) as HtmlEscapedString)) || ''
      ) as HtmlEscapedString
      const fallbackResString = await Fragment({
        children: fallbackRes,
      }).toString()
      return raw(
        fallbackResString,
        (fallbackResString as HtmlEscapedString).callbacks || fallbackRes.callbacks
      )
    })
  }
  let resArray: HtmlEscapedString[] | Promise<HtmlEscapedString[]>[] = []
  try {
    resArray = children.map(resolveChildEarly) as unknown as HtmlEscapedString[]
  } catch (e) {
    const resume = getResume()
    if (e instanceof Promise) {
      resArray = [
        e
          .then(() => resume(() => childrenToString(children as Child[])))
          .catch((e) => renderFallback(e)),
      ] as Promise<HtmlEscapedString[]>[]
    } else {
      resArray = [await renderFallback(e as Error)]
    }
  }

  if (resArray.some((res) => (res as {}) instanceof Promise)) {
    // Prime the context capture while still synchronous: a child that returned
    // a Promise from `resolveChildEarly` skipped the `catch`, so the deferred
    // `catchCallback` would otherwise capture too late.
    getResume()
    const index = errorBoundaryCounter++
    const replaceRe = RegExp(`(<template id="E:${index}"></template>.*?)(.*?)(<!--E:${index}-->)`)
    let caught = false
    const catchCallback = async ({ error, buffer }: { error: Error; buffer?: [string] }) => {
      if (caught) {
        return ''
      }
      caught = true

      const fallbackResString = await renderFallback(error)
      const fallbackCallbacks = fallbackResString.callbacks
      if (buffer) {
        buffer[0] = buffer[0].replace(replaceRe, fallbackResString)
        return fallbackCallbacks?.length ? raw('', fallbackCallbacks) : ''
      }
      return raw(
        `<template data-hono-target="E:${index}">${fallbackResString}</template><script>
((d,c,n) => {
c=d.currentScript.previousSibling
d=d.getElementById('E:${index}')
if(!d)return
do{n=d.nextSibling;n.remove()}while(n.nodeType!=8||n.nodeValue!='E:${index}')
d.replaceWith(c.content)
})(document)
</script>`,
        fallbackCallbacks
      )
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
