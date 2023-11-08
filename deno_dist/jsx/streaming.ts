import type { HtmlEscapedString } from '../utils/html.ts'
import type { FC, Child } from './index.ts'

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
      res = e.then(() => childrenToString(children))
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
        promise.then((_html) => {
          const html = `<template>${_html}</template><script>
((d,c,n) => {
c=d.currentScript.previousSibling
d=d.getElementById('H:${index}')
do{n=d.nextSibling;n.remove()}while(n.nodeType!=8||n.nodeValue!='/$')
d.replaceWith(c.content)
})(document)
</script>`
          if (!(_html as HtmlEscapedString).promises?.length) {
            return html
          }

          const promiseRes = new String(html) as HtmlEscapedString
          promiseRes.isEscaped = true
          promiseRes.promises = (_html as HtmlEscapedString).promises
          return promiseRes
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
      const resolved = await (str instanceof Promise ? await str : str).toString()
      controller.enqueue(textEncoder.encode(resolved))

      let unresolvedPromises = (resolved as HtmlEscapedString).promises || []
      while (unresolvedPromises.length) {
        const promises = unresolvedPromises.map((promise) =>
          promise
            .catch((err) => {
              console.trace(err)
              return ''
            })
            .then((res) => {
              if ((res as HtmlEscapedString).promises) {
                unresolvedPromises.push(...((res as HtmlEscapedString).promises || []))
              }
              controller.enqueue(textEncoder.encode(res))
            })
        )
        unresolvedPromises = []
        await Promise.all(promises)
      }

      controller.close()
    },
  })
  return reader
}
