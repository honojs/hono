import type { Props, JSXNode } from '../base'
import { normalizeIntrinsicElementProps } from '../utils'

const JSXNodeCompatPrototype = {
  type: {
    get(this: { tag: string | Function }): string | Function {
      return this.tag
    },
  },
  ref: {
    get(this: { props?: { ref: unknown } }): unknown {
      return this.props?.ref
    },
  },
}

export const jsxDEV = (tag: string | Function, props: Props, key?: string): JSXNode => {
  if (typeof tag === 'string') {
    normalizeIntrinsicElementProps(props)
  }
  return Object.defineProperties(
    {
      tag,
      props,
      key,
    },
    JSXNodeCompatPrototype
  ) as JSXNode
}

export const Fragment = (props: Record<string, unknown>) => jsxDEV('', props, undefined)
