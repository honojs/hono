import { jsx } from './index.ts'
import type { JSXNode } from './index.ts'
export { Fragment } from './index.ts'

export function jsxDEV(tag: string | Function, props: Record<string, any>): JSXNode {
  const children = props.children ?? []
  delete props['children']
  return jsx(tag, props, children)
}
