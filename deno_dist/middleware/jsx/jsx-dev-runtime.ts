import type { HtmlEscapedString } from '../html/index.ts'
import { jsx } from './index.ts'

export function jsxDEV(tag: string | Function, props: Record<string, any>): HtmlEscapedString {
  const children = props.children ?? []
  delete props['children']
  return jsx(tag, props, children)
}
