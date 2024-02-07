import type { Props } from '../base.ts'
import { normalizeIntrinsicElementProps } from '../utils.ts'

export const jsxDEV = (tag: string | Function, props: Props, key?: string) => {
  if (typeof tag === 'string') {
    normalizeIntrinsicElementProps(props)
  }
  let children
  if (props && 'children' in props) {
    children = props.children
    delete props['children']
  } else {
    children = []
  }
  return {
    tag,
    props,
    key,
    children: Array.isArray(children) ? children : [children],
  }
}

export const Fragment = (props: Record<string, unknown>) => jsxDEV('', props, undefined)
