import type { HtmlEscapedString } from '../utils/html.ts'
import type { FC } from './index.ts'

const useContexts: any[][] = []

let suspenseCounter = 0
let useCounter = 0
let currentUseContext: number = 0
let useIndex: number = 0

export const Suspense: FC<{ fallback: any }> = async ({ children, fallback }) => {
  let res
  const useContext = createUseContext()
  try {
    res = children?.toString() || ''
  } catch (e) {
    const index = suspenseCounter++
    if (e instanceof Promise) {
      res = new String(
        `<template id="H:${index}"></template>${fallback.toString()}`
      ) as HtmlEscapedString
      res.isEscaped = true
      ;(res.promises ||= []).push(
        e.then(() => {
          setUseContext(useContext)
          return `<template>${children?.toString() || ''}</template><script>
((d, c) => {
c=d.currentScript.previousSibling
d=d.getElementById('H:${index}')
d.nextElementSibling.remove()
d.replaceWith(c.content)
})(document)
</script>`
        })
      )
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
  useIndex = 0
  currentUseContext = index
}

export const use = <T>(promise: Promise<T> | (() => Promise<T>)): T => {
  useIndex++

  if (useContexts[currentUseContext]) {
    return useContexts[currentUseContext][useIndex - 1]
  }

  if (typeof promise === 'function') {
    promise = promise()
  }
  promise.then((res) => ((useContexts[currentUseContext] ||= [])[useIndex - 1] = res))

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
