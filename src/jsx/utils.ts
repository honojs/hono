import { raw } from '../helper/html'
import type { HtmlEscapedString } from '../utils/html'
import type { FC, Child } from './index'

let errorBoundaryCounter = 0

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

type ErrorHandler = (error: Error) => void
type FallbackRender = (error: Error) => HtmlEscapedString
export const ErrorBoundary: FC<{
  fallback?: HtmlEscapedString
  fallbackRender?: FallbackRender
  onError?: ErrorHandler
}> = async ({ children, fallback, fallbackRender, onError }) => {
  if (!children) {
    return raw('')
  }

  if (!Array.isArray(children)) {
    children = [children]
  }

  const fallbackRes = (error: Error): HtmlEscapedString =>
    (fallback || fallbackRender?.(error) || '').toString() as HtmlEscapedString
  let resArray: HtmlEscapedString[] | Promise<HtmlEscapedString[]>[] = []
  try {
    resArray = children.map((c) => c.toString()) as HtmlEscapedString[]
  } catch (e) {
    if (e instanceof Promise) {
      resArray = [
        e.then(() => childrenToString(children as Child[])).catch((e) => fallbackRes(e)),
      ] as Promise<HtmlEscapedString[]>[]
    } else {
      resArray = [fallbackRes(e as Error)]
    }
  }

  if (resArray.some((res) => (res as {}) instanceof Promise)) {
    const index = errorBoundaryCounter++
    const replaceRe = RegExp(`(<template id="E:${index}"></template>.*?)(<!--_\\$-->)`)
    const catchCallback = ({ error, buffer }: { error: Error; buffer?: [string] }) => {
      onError?.(error)
      const fallbackResString = fallbackRes(error)
      if (buffer) {
        buffer[0] = buffer[0].replace(replaceRe, fallbackResString)
      }
      return buffer
        ? ''
        : `<template>${fallbackResString}</template><script>
((d,c,n) => {
c=d.currentScript.previousSibling
d=d.getElementById('E:${index}')
do{n=d.nextSibling;n.remove()}while(n.nodeType!=8||n.nodeValue!='_$')
d.replaceWith(c.content)
})(document)
</script>`
    }
    return raw(`<template id="E:${index}"></template><!--_$-->`, [
      ({ buffer }) => {
        return Promise.all(resArray)
          .then((htmlArray) => {
            htmlArray = htmlArray.flat()
            const content = htmlArray.join('')
            if (buffer) {
              buffer[0] = buffer[0].replace(replaceRe, (_, pre, post) => `${pre}${content}${post}`)
            }
            const html = buffer
              ? ''
              : `<template>${content}</template><script>
((d,c) => {
c=d.currentScript.previousSibling
d=d.getElementById('E:${index}')
d.parentElement.insertBefore(c.content,d.nextSibling)
})(document)
</script>`

            if (htmlArray.every((html) => !(html as HtmlEscapedString).callbacks?.length)) {
              return html
            }

            return raw(
              html,
              htmlArray
                .map((html) => (html as HtmlEscapedString).callbacks || [])
                .flat()
                .map(
                  (c) =>
                    ({ buffer }) =>
                      c({ buffer }).catch((error) => catchCallback({ error, buffer }))
                )
            )
          })
          .catch((error) => catchCallback({ error, buffer }))
      },
    ])
  } else {
    return raw(resArray.join(''))
  }
}
