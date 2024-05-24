import type { Props, JSXNode } from '../base'
import { normalizeIntrinsicElementProps } from '../utils'
import { newJSXNode } from './utils'

export const jsxDEV = (tag: string | Function, props: Props, key?: string): JSXNode => {
  if (typeof tag === 'string') {
    normalizeIntrinsicElementProps(props)
  }
  return newJSXNode({
    tag,
    props,
    key,
  })
}

export const Fragment = (props: Record<string, unknown>): JSXNode => jsxDEV('', props, undefined)
