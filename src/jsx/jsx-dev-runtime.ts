import type { HtmlEscapedString } from '../utils/html'
import { jsx } from '.'
import type { JSXNode } from '.'
export { Fragment } from '.'

export function jsxDEV(tag: string | Function, props: Record<string, unknown>): JSXNode {
  if (!props?.children) {
    return jsx(tag, props)
  }
  const children = props.children as string | HtmlEscapedString
  delete props['children']
  return Array.isArray(children) ? jsx(tag, props, ...children) : jsx(tag, props, children)
}
