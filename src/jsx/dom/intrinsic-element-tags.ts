import type { Props } from '../base'
import type { FC, PropsWithChildren } from '../types'
import { newJSXNode } from './utils'
import { createPortal, getNameSpaceContext } from './render'
import { useContext } from '../context'

const documentMetadataTag = (tag: string, props: Props) => {
  const jsxNode = newJSXNode({
    tag,
    props,
  })

  if (props?.itemProp || props?.itemprop) {
    return jsxNode
  }

  let selector = tag
  if (props) {
    for (const [key, value] of Object.entries(props)) {
      if (typeof value === 'string') {
        const v = value.includes('"') ? value.replace(/"/g, '\\"') : value
        selector += `[${key}="${v}"]`
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(jsxNode as any).e = document.head.querySelector(selector)

  return createPortal(
    jsxNode,
    document.head
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ) as any
}
export const title: FC<PropsWithChildren> = (props) => {
  const nameSpaceContext = getNameSpaceContext()
  const ns = nameSpaceContext && useContext(nameSpaceContext)
  if (ns?.includes('svg')) {
    return newJSXNode({
      tag: 'title',
      props,
    })
  }
  return documentMetadataTag('title', props)
}
export const script: FC<PropsWithChildren> = (props) => {
  return documentMetadataTag('script', props)
}
export const style: FC<PropsWithChildren> = (props) => {
  return documentMetadataTag('style', props)
}
export const link: FC<PropsWithChildren> = (props) => {
  return documentMetadataTag('link', props)
}
