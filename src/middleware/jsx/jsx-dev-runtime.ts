import type { HtmlEscapedString } from '../html'
import { jsx } from '.'

export function jsxDEV(tag: string | Function, props: Record<string, any>): HtmlEscapedString {
  const children = props.children ?? []
  delete props['children']
  return jsx(tag, props, ...children)
}
