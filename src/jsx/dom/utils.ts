import { DOM_INTERNAL_TAG } from '../constants'

export const setInternalTagFlag = (fn: Function) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(fn as any)[DOM_INTERNAL_TAG] = true
  return fn
}
