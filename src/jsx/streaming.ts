import { raw } from '../helper/html'
import { HtmlEscapedCallbackPhase, resolveCallback } from '../utils/html'
import type { HtmlEscapedString } from '../utils/html'
import { childrenToString } from './components'
import type { FC, Child } from './index'

let suspenseCounter = 0

/**
 * @experimental
 * `Suspense` is an experimental feature.
 * The API might be changed.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const Suspense: FC<{ fallback: any }> = async ({ children, fallback }) => {
  if (!children) {
    return fallback.toString()
  }
  if (!Array.isArray(children)) {
    children = [children]
  }

  let resArray: HtmlEscapedString[] | Promise<HtmlEscapedString[]>[] = []
  try {
    resArray = children.map((c) => c.toString()) as HtmlEscapedString[]
  } catch (e) {
    if (e instanceof Promise) {
      resArray = [e.then(() => childrenToString(children as Child[]))] as Promise<
        HtmlEscapedString[]
      >[]
    } else {
      throw e
    }
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
            : `<template>${content}</template><script>
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
