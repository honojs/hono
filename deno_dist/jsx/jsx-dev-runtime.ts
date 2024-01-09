import type { HtmlEscapedString } from '../utils/html.ts'
import { jsx } from './index.ts'
import type { JSXNode } from './index.ts'
export { Fragment } from './index.ts'

export function jsxDEV(
  tag: string | Function,
  props: Record<string, unknown>,
  key: string | undefined
): JSXNode {
  let node: JSXNode
  if (!props || !('children' in props)) {
    node = jsx(tag, props)
  } else {
    const children = props.children as string | HtmlEscapedString
    delete props['children']
    node = Array.isArray(children) ? jsx(tag, props, ...children) : jsx(tag, props, children)
  }
  node.key = key
  return node
}
