import type { HtmlEscapedCallback, HtmlEscapedString } from '../../utils/html'
import { JSXNode } from '../base'
import type { Child, Props } from '../base'
import type { FC, PropsWithChildren } from '../types'
import { raw } from '../../helper/html'
import { deDupeKeys } from './common'

const metaTagMap: WeakMap<
  object,
  Record<string, [string, Props, string | undefined][]>
> = new WeakMap()
const insertIntoHead: (
  tagName: string,
  tag: string,
  props: Props,
  precedence: string | undefined
) => HtmlEscapedCallback =
  (tagName, tag, props, precedence) =>
  ({ buffer, context }): undefined => {
    if (!buffer) {
      return
    }
    const map = metaTagMap.get(context) || {}
    metaTagMap.set(context, map)
    const tags = (map[tagName] ||= [])

    let duped = false
    const keys = deDupeKeys[tagName]
    LOOP: for (const [, props] of tags) {
      for (const key of keys) {
        if (props?.[key] === props?.[key]) {
          duped = true
          break LOOP
        }
      }
    }

    if (duped) {
      buffer[0] = buffer[0].replaceAll(tag, '')
    } else {
      tags.push([tag, props, precedence])
    }

    if (buffer[0].indexOf('</head>') !== -1) {
      let insertTags
      if (precedence === undefined) {
        insertTags = tags.map(([tag]) => tag)
      } else {
        const precedences: string[] = []
        insertTags = tags
          .map(([tag, , precedence]) => {
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
        buffer[0] = buffer[0].replaceAll(tag, '')
      })
      buffer[0] = buffer[0].replace(/(?=<\/head>)/, insertTags.join(''))
    }
  }

const documentMetadataTag = (tag: string, children: Child, props: Props, sort: boolean) => {
  props = { ...props }
  const precedence = sort ? props?.precedence ?? '' : undefined
  delete props.precedence

  const string = new JSXNode(tag, props, children as Child[]).toString()

  if (props?.itemProp) {
    return raw(string)
  }

  if (string instanceof Promise) {
    return string.then((resString) =>
      raw(string, [
        ...((resString as HtmlEscapedString).callbacks || []),
        insertIntoHead(tag, resString, props, precedence),
      ])
    )
  } else {
    return raw(string, [insertIntoHead(tag, string, props, precedence)])
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
