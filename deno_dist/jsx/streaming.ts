import { raw } from '../helper/html/index.ts'
import { HtmlEscapedCallbackPhase, resolveCallback } from '../utils/html.ts'
import type { HtmlEscapedString } from '../utils/html.ts'
import { childrenToString } from './components.ts'
import { DOM_RENDERER, DOM_STASH } from './constants.ts'
import { Suspense as SuspenseDomRenderer } from './dom/components.ts'
import { buildDataStack } from './dom/render.ts'
import type { HasRenderToDom, NodeObject } from './dom/render.ts'
import type { FC, PropsWithChildren, Child } from './index.ts'

let suspenseCounter = 0

/**
 * @experimental
 * `Suspense` is an experimental feature.
 * The API might be changed.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const Suspense: FC<PropsWithChildren<{ fallback: any }>> = async ({
  children,
  fallback,
}) => {
  if (!children) {
    return fallback.toString()
  }
  if (!Array.isArray(children)) {
    children = [children]
  }

  let resArray: HtmlEscapedString[] | Promise<HtmlEscapedString[]>[] = []

  // for use() hook
  const stackNode = { [DOM_STASH]: [0, []] } as unknown as NodeObject
  const popNodeStack = (value?: unknown) => {
    buildDataStack.pop()
    return value
  }

  try {
    stackNode[DOM_STASH][0] = 0
    buildDataStack.push([[], stackNode])
    resArray = children.map((c) => c.toString()) as HtmlEscapedString[]
  } catch (e) {
    if (e instanceof Promise) {
      resArray = [
        e.then(() => {
          stackNode[DOM_STASH][0] = 0
          buildDataStack.push([[], stackNode])
          return childrenToString(children as Child[]).then(popNodeStack)
        }),
      ] as Promise<HtmlEscapedString[]>[]
    } else {
      throw e
    }
  } finally {
    popNodeStack()
  }

  if (resArray.some((res) => (res as {}) instanceof Promise)) {
    const index = suspenseCounter++
    const fallbackStr = await fallback.toString()
    return raw(`<template id="H:${index}"></template>${fallbackStr}<!--/$-->`, [
      ...(fallbackStr.callbacks || []),
      ({ phase, buffer, context }) => {
        if (phase === HtmlEscapedCallbackPhase.BeforeStream) {
          return
        }
        return Promise.all(resArray).then(async (htmlArray) => {
          htmlArray = htmlArray.flat()
          const content = htmlArray.join('')
          if (buffer) {
            buffer[0] = buffer[0].replace(
              new RegExp(`<template id="H:${index}"></template>.*?<!--/\\$-->`),
              content
            )
          }
          let html = buffer
            ? ''
            : `<template data-hono-target="H:${index}">${content}</template><script>
((d,c,n) => {
c=d.currentScript.previousSibling
d=d.getElementById('H:${index}')
if(!d)return
do{n=d.nextSibling;n.remove()}while(n.nodeType!=8||n.nodeValue!='/$')
d.replaceWith(c.content)
})(document)
</script>`

          const callbacks = htmlArray
            .map((html) => (html as HtmlEscapedString).callbacks || [])
            .flat()
          if (!callbacks.length) {
            return html
          }

          if (phase === HtmlEscapedCallbackPhase.Stream) {
            html = await resolveCallback(html, HtmlEscapedCallbackPhase.BeforeStream, true, context)
          }

          return raw(html, callbacks)
        })
      },
    ])
  } else {
    return raw(resArray.join(''))
  }
}
;(Suspense as HasRenderToDom)[DOM_RENDERER] = SuspenseDomRenderer

const textEncoder = new TextEncoder()
/**
 * @experimental
 * `renderToReadableStream()` is an experimental feature.
 * The API might be changed.
 */
export const renderToReadableStream = (
  str: HtmlEscapedString | Promise<HtmlEscapedString>
): ReadableStream<Uint8Array> => {
  const reader = new ReadableStream<Uint8Array>({
    async start(controller) {
      const tmp = str instanceof Promise ? await str : await str.toString()
      const context = typeof tmp === 'object' ? tmp : {}
      const resolved = await resolveCallback(
        tmp,
        HtmlEscapedCallbackPhase.BeforeStream,
        true,
        context
      )
      controller.enqueue(textEncoder.encode(resolved))

      let resolvedCount = 0
      const callbacks: Promise<void>[] = []
      const then = (promise: Promise<string>) => {
        callbacks.push(
          promise
            .catch((err) => {
              console.trace(err)
              return ''
            })
            .then(async (res) => {
              res = await resolveCallback(res, HtmlEscapedCallbackPhase.BeforeStream, true, context)
              ;(res as HtmlEscapedString).callbacks
                ?.map((c) => c({ phase: HtmlEscapedCallbackPhase.Stream, context }))
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .filter<Promise<string>>(Boolean as any)
                .forEach(then)
              resolvedCount++
              controller.enqueue(textEncoder.encode(res))
            })
        )
      }
      ;(resolved as HtmlEscapedString).callbacks
        ?.map((c) => c({ phase: HtmlEscapedCallbackPhase.Stream, context }))
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter<Promise<string>>(Boolean as any)
        .forEach(then)
      while (resolvedCount !== callbacks.length) {
        await Promise.all(callbacks)
      }

      controller.close()
    },
  })
  return reader
}
