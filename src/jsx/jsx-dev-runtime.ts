import type { HtmlEscapedString } from '../utils/html'
import { jsx } from '.'
import type { JSXNode } from '.'
export { Fragment } from '.'

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
