import { jsx } from '.'
import type { JSXNode } from '.'

export function jsxDEV(tag: string | Function, props: Record<string, any>): JSXNode {
  const children = props.children ?? []
  delete props['children']
  return jsx(tag, props, children)
}
