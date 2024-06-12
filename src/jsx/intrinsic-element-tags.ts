import type { HtmlEscapedCallback, HtmlEscapedString } from '../utils/html'
import { JSXNode } from './base'
import type { Child, Props } from './base'
import type { FC, PropsWithChildren } from './types'
import { raw } from '../helper/html'

const insertIntoHead: (string: string) => HtmlEscapedCallback =
  (string) =>
  ({ buffer }): Promise<string> | undefined => {
    if (!buffer) {
      return
    }
    if (buffer[0].indexOf('</head>') !== -1) {
      buffer[0] = buffer[0]
        .replace(string, '')
        .replace(/(<\/head>)/, `${string}$1`)
    }
  }

const documentMetadataTag = (tag: string, children: Child, props: Props) => {
  const string = new JSXNode(tag, props, children as Child[]).toString()

  if (props?.itemProp || props?.itemprop) {
    return raw(string)
  }

  if (string instanceof Promise) {
    return string.then((resString) =>
      raw(string, [...((resString as HtmlEscapedString).callbacks || []), insertIntoHead(resString)])
    )
  } else {
    return raw(string, [insertIntoHead(string)])
  }
}

export const title: FC<PropsWithChildren> = ({ children, ...props }) => {
  return documentMetadataTag('title', children, props)
}
export const script: FC<PropsWithChildren> = ({ children, ...props }) => {
  return documentMetadataTag('script', children, props)
}
export const style: FC<PropsWithChildren> = ({ children, ...props }) => {
  return documentMetadataTag('style', children, props)
}
export const link: FC<PropsWithChildren> = ({ children, ...props }) => {
  return documentMetadataTag('link', children, props)
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
