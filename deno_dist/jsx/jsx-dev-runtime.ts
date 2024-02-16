import type { HtmlEscapedString } from '../utils/html.ts'
import { jsxFn } from './base.ts'
import type { JSXNode } from './base.ts'
export { Fragment } from './base.ts'

export function jsxDEV(
  tag: string | Function,
  props: Record<string, unknown>,
  key?: string
): JSXNode {
  let node: JSXNode
  if (!props || !('children' in props)) {
    node = jsxFn(tag, props, [])
  } else {
    const children = props.children as string | HtmlEscapedString
    delete props['children']
    node = Array.isArray(children) ? jsxFn(tag, props, children) : jsxFn(tag, props, [children])
  }
  node.key = key
  return node
}
