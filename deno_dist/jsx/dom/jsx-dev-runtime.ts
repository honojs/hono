import type { Props, JSXNode } from '../base.ts'
import { normalizeIntrinsicElementProps } from '../utils.ts'
import { newJSXNode } from './utils.ts'

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
