import type { HtmlEscapedCallback, HtmlEscapedString } from '../../utils/html'
import { JSXNode } from '../base'
import type { Child, Props } from '../base'
import type { FC, PropsWithChildren } from '../types'
import { raw } from '../../helper/html'

const metaTagMap: WeakMap<object, Record<string, [string, string | undefined][]>> = new WeakMap()
const insertIntoHead: (
  tagName: string,
  tag: string,
  precedence: string | undefined
) => HtmlEscapedCallback =
  (tagName, tag, precedence) =>
  ({ buffer, context }): undefined => {
    if (!buffer) {
      return
    }
    const map = metaTagMap.get(context) || {}
    metaTagMap.set(context, map)
    const tags = (map[tagName] ||= [])
    tags.push([tag, precedence])

    if (buffer[0].indexOf('</head>') !== -1) {
      let insertTags
      if (precedence === undefined) {
        insertTags = tags.map(([tag]) => tag)
      } else {
        const precedences: string[] = []
        insertTags = tags
          .map(([tag, precedence]) => {
            let order = precedences.indexOf(precedence as string)
            if (order === -1) {
              precedences.push(precedence as string)
              order = precedences.length - 1
            }
            return [tag, order] as [string, number]
          })
          .sort((a, b) => a[1] - b[1])
          .map(([tag]) => tag)
      }

      insertTags.forEach((tag) => {
        buffer[0] = buffer[0].replace(tag, '')
      })
      buffer[0] = buffer[0].replace(/(?=<\/head>)/, insertTags.join(''))
    }
  }

const documentMetadataTag = (tag: string, children: Child, props: Props, sort: boolean) => {
  props = { ...props }
  const precedence = sort ? props?.precedences ?? '' : undefined
  delete props.precedences

  const string = new JSXNode(tag, props, children as Child[]).toString()

  if (props?.itemProp) {
    return raw(string)
  }

  if (string instanceof Promise) {
    return string.then((resString) =>
      raw(string, [
        ...((resString as HtmlEscapedString).callbacks || []),
        insertIntoHead(tag, resString, precedence),
      ])
    )
  } else {
    return raw(string, [insertIntoHead(tag, string, precedence)])
  }
}

export const title: FC<PropsWithChildren> = ({ children, ...props }) => {
  return documentMetadataTag('title', children, props, false)
}
export const script: FC<PropsWithChildren> = ({ children, ...props }) => {
  return documentMetadataTag('script', children, props, false)
}
export const style: FC<PropsWithChildren> = ({ children, ...props }) => {
  return documentMetadataTag('style', children, props, true)
}
export const link: FC<PropsWithChildren> = ({ children, ...props }) => {
  return documentMetadataTag('link', children, props, true)
}
export const meta: FC<PropsWithChildren> = ({ children, ...props }) => {
  return documentMetadataTag('meta', children, props, true)
}
export const form: FC<
  PropsWithChildren<{
    action?: Function | string
    method?: 'get' | 'post'
  }>
> = ({ children, ...props }) => {
  if (typeof props.action !== 'function') {
    delete props.action
  }

  return new JSXNode('form', props, children as Child[]).toString() as HtmlEscapedString
}
