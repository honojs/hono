import { raw } from '../helper/html'
import type { HtmlEscapedString } from '../utils/html'
import type { FC, Child } from './index'

let suspenseCounter = 0

async function childrenToString(children: Child[]): Promise<HtmlEscapedString[]> {
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
    return raw(`<template id="H:${index}"></template>${fallback.toString()}<!--/$-->`, [
      Promise.all(resArray).then((htmlArray) => {
        htmlArray = htmlArray.flat()
        const html = `<template>${htmlArray.join('')}</template><script>
((d,c,n) => {
c=d.currentScript.previousSibling
d=d.getElementById('H:${index}')
do{n=d.nextSibling;n.remove()}while(n.nodeType!=8||n.nodeValue!='/$')
d.replaceWith(c.content)
})(document)
</script>`
        if (htmlArray.every((html) => !(html as HtmlEscapedString).promises?.length)) {
          return html
        }

        return raw(html, htmlArray.flatMap((html) => (html as HtmlEscapedString).promises || []))
      })
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
      const resolved = str instanceof Promise ? await str : await str.toString()
      controller.enqueue(textEncoder.encode(resolved))

      let resolvedCount = 0
      const promises: Promise<void>[] = []
      const then = (promise: Promise<string>) => {
        promises.push(
          promise
            .catch((err) => {
              console.trace(err)
              return ''
            })
            .then((res) => {
              if ((res as HtmlEscapedString).promises) {
                const resPromises = (res as HtmlEscapedString).promises || []
                resPromises.forEach(then)
              }
              resolvedCount++
              controller.enqueue(textEncoder.encode(res))
            })
        )
      }
      ;(resolved as HtmlEscapedString).promises?.map(then)
      while (resolvedCount !== promises.length) {
        await Promise.all(promises)
      }

      controller.close()
    }
  })
  return reader
}
