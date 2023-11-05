import type { HtmlEscapedString } from '../utils/html.ts'
import type { FC, Child } from './index.ts'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const useContexts: any[][] = []

let suspenseCounter = 0
let useCounter = 0
let currentUseContext: number = 0
let useIndex: number = -1

async function childrenToString(useContext: number, children: Child): Promise<string> {
  setUseContext(useContext)
  try {
    return children.toString()
  } catch (e) {
    if (e instanceof Promise) {
      await e
      return childrenToString(useContext, children)
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
  const useContext = createUseContext()
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
          return `<template>${await childrenToString(useContext, children)}</template><script>
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

const createUseContext = (): number => {
  const newUseContext = useCounter++
  useContexts[newUseContext] = []
  setUseContext(newUseContext)
  return newUseContext
}

const setUseContext = (index: number): void => {
  useIndex = -1
  currentUseContext = index
}

/**
 * @experimental
 * `use()` is an experimental feature.
 * The API might be changed.
 */
export const use = <T>(promise: Promise<T>): T => {
  useIndex++

  if (useIndex in useContexts[currentUseContext]) {
    return useContexts[currentUseContext][useIndex]
  }

  promise.then((res) => (useContexts[currentUseContext][useIndex] = res))

  throw promise
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
