import type { HtmlEscapedString } from '../utils/html.ts'
import { jsxFn } from './index.ts'
import type { JSXNode } from './index.ts'
export { Fragment } from './index.ts'

export function jsxDEV(
  tag: string | Function,
  props: Record<string, unknown>,
  key: string | undefined
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
