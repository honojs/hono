import type { Props, JSXNode } from '../base'
import { DOM_INTERNAL_TAG } from '../constants'

export const setInternalTagFlag = (fn: Function): Function => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(fn as any)[DOM_INTERNAL_TAG] = true
  return fn
}

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

export const newJSXNode = (obj: { tag: string | Function; props?: Props; key?: string }): JSXNode =>
  Object.defineProperties(obj, JSXNodeCompatPrototype) as JSXNode
