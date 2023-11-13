import type { HtmlEscapedString } from '../utils/html.ts'
import { jsx } from './index.ts'
import type { JSXNode } from './index.ts'
export { Fragment } from './index.ts'

export function jsxDEV(tag: string | Function, props: Record<string, unknown>): JSXNode {
  if (!props?.children) {
    return jsx(tag, props)
  }
  const children = props.children as string | HtmlEscapedString
  delete props['children']
  return Array.isArray(children) ? jsx(tag, props, ...children) : jsx(tag, props, children)
}
