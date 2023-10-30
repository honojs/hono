import type { HtmlEscapedString } from '../utils/html'
import type { FC, Child } from './index'

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

export const Suspense: FC<{ fallback: any }> = async ({ children, fallback }) => {
  if (!children) {
    return fallback.toString()
  }

  let res
  const useContext = createUseContext()
  try {
    res = children.toString()
  } catch (e) {
    const index = suspenseCounter++
    if (e instanceof Promise) {
      res = new String(
        `<template id="H:${index}"></template>${fallback.toString()}<!--/$-->`
      ) as HtmlEscapedString
      res.isEscaped = true
      res.promises = [
        e.then(async () => {
          return `<template>${await childrenToString(useContext, children)}</template><script>
((d,c,n) => {
c=d.currentScript.previousSibling
d=d.getElementById('H:${index}')
while(n=d.nextSibling){n.remove();if(n.nodeType===8&&n.nodeValue==='/$')break}
d.replaceWith(c.content)
})(document)
</script>`
        }),
      ]
    } else {
      throw e
    }
  }
  return res as HtmlEscapedString
}

export const createUseContext = (): number => {
  const newUseContext = useCounter++
  setUseContext(newUseContext)
  return newUseContext
}

export const setUseContext = (index: number): void => {
  useIndex = -1
  currentUseContext = index
}

export const use = <T>(promise: Promise<T>): T => {
  useIndex++

  if (useContexts[currentUseContext]?.[useIndex]) {
    return useContexts[currentUseContext][useIndex]
  }

  promise.then((res) => ((useContexts[currentUseContext] ||= [])[useIndex] = res))

  throw promise
}

const textEncoder = new TextEncoder()
export const renderToReadableStream = (
  str: HtmlEscapedString | Promise<HtmlEscapedString>
): ReadableStream<Uint8Array> => {
  const reader = new ReadableStream<Uint8Array>({
    async start(controller) {
      const resolved = await str.toString()
      controller.enqueue(textEncoder.encode(resolved))
      if (typeof resolved !== 'object' || !(resolved as HtmlEscapedString).promises?.length) {
        controller.close()
        return
      }

      const len = (resolved as HtmlEscapedString).promises?.length
      let resolvedCount = 0
      for (const p of (resolved as HtmlEscapedString).promises || []) {
        p.then((res) => {
          resolvedCount++
          controller.enqueue(textEncoder.encode(res))
          if (resolvedCount === len) {
            controller.close()
          }
        })
      }
    },
  })
  return reader
}
