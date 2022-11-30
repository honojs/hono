import type { HtmlEscapedString } from '../../utils/html'
import { jsx } from '.'
import type { JSXNode } from '.'
export { Fragment } from '.'

export function jsxDEV(tag: string | Function, props: Record<string, unknown>): JSXNode {
  const children = (props.children ?? []) as (string | HtmlEscapedString)
  delete props['children']
  return jsx(tag, props, children)
}
