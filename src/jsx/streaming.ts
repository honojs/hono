import type { HtmlEscapedString } from '../utils/html'
import type { FC, Child } from './index'

let suspenseCounter = 0

async function childrenToString(children: Child): Promise<string> {
  try {
    return children.toString()
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

  let res
  try {
    res = children.toString()
  } catch (e) {
    if (e instanceof Promise) {
      res = e
    } else {
      throw e
    }
  } finally {
    const index = suspenseCounter++
    if (res instanceof Promise) {
      const promise = res
      res = new String(
        `<template id="H:${index}"></template>${fallback.toString()}<!--/$-->`
      ) as HtmlEscapedString
      res.isEscaped = true
      res.promises = [
        promise.then(async () => {
          return `<template>${await childrenToString(children)}</template><script>
((d,c,n) => {
c=d.currentScript.previousSibling
d=d.getElementById('H:${index}')
do{n=d.nextSibling;n.remove()}while(n.nodeType!=8||n.nodeValue!='/$')
d.replaceWith(c.content)
})(document)
</script>`
        }),
      ]
    }
  }
  return res as HtmlEscapedString
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
      const resolved = await str.toString()
      controller.enqueue(textEncoder.encode(resolved))

      let unresolvedCount = (resolved as HtmlEscapedString).promises?.length || 0
      if (!unresolvedCount) {
        controller.close()
        return
      }

      for (let i = 0; i < unresolvedCount; i++) {
        ;((resolved as HtmlEscapedString).promises as Promise<string>[])[i]
          .catch((err) => {
            console.trace(err)
            return ''
          })
          .then((res) => {
            controller.enqueue(textEncoder.encode(res))
            if (!--unresolvedCount) {
              controller.close()
            }
          })
      }
    },
  })
  return reader
}
