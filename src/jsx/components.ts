import { raw } from '../helper/html'
import type { HtmlEscapedString, HtmlEscapedCallback } from '../utils/html'
import { HtmlEscapedCallbackPhase, resolveCallback } from '../utils/html'
import { DOM_RENDERER } from './constants'
import { ErrorBoundary as ErrorBoundaryDomRenderer } from './dom/components'
import type { HasRenderToDom } from './dom/render'
import type { FC, PropsWithChildren, Child } from '.'

let errorBoundaryCounter = 0

export const childrenToString = async (children: Child[]): Promise<HtmlEscapedString[]> => {
  try {
    return children.map((c) => c.toString()) as HtmlEscapedString[]
  } catch (e) {
    if (e instanceof Promise) {
      await e
      return childrenToString(children)
    } else {
      throw e
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

  let fallbackStr: string | undefined
  const fallbackRes = (error: Error): HtmlEscapedString => {
    onError?.(error)
    return (fallbackStr || fallbackRender?.(error) || '').toString() as HtmlEscapedString
  }
  let resArray: HtmlEscapedString[] | Promise<HtmlEscapedString[]>[] = []
  try {
    resArray = children.map((c) => c.toString()) as HtmlEscapedString[]
  } catch (e) {
    fallbackStr = await fallback?.toString()
    if (e instanceof Promise) {
      resArray = [
        e.then(() => childrenToString(children as Child[])).catch((e) => fallbackRes(e)),
      ] as Promise<HtmlEscapedString[]>[]
    } else {
      resArray = [fallbackRes(e as Error)]
    }
  }

  if (resArray.some((res) => (res as {}) instanceof Promise)) {
    fallbackStr ||= await fallback?.toString()
    const index = errorBoundaryCounter++
    const replaceRe = RegExp(`(<template id="E:${index}"></template>.*?)(.*?)(<!--E:${index}-->)`)
    const caught = false
    const catchCallback = ({ error, buffer }: { error: Error; buffer?: [string] }) => {
      if (caught) {
        return ''
      }

      const fallbackResString = fallbackRes(error)
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
    return raw(`<template id="E:${index}"></template><!--E:${index}-->`, [
      ({ phase, buffer, context }) => {
        if (phase === HtmlEscapedCallbackPhase.BeforeStream) {
          return
        }
        return Promise.all(resArray)
          .then(async (htmlArray) => {
            htmlArray = htmlArray.flat()
            const content = htmlArray.join('')
            let html = buffer
              ? ''
              : `<template data-hono-target="E:${index}">${content}</template><script>
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
    return raw(resArray.join(''))
  }
}
;(ErrorBoundary as HasRenderToDom)[DOM_RENDERER] = ErrorBoundaryDomRenderer
