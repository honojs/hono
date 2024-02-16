export {
  useState,
  useEffect,
  useRef,
  useCallback,
  use,
  startTransition,
  useTransition,
  useDeferredValue,
  startViewTransition,
  useViewTransition,
  useMemo,
  useLayoutEffect,
} from '../hooks'
export { render } from './render'
export { Suspense, ErrorBoundary } from './components'
export { useContext } from '../context'
export type { Context } from '../context'
export { createContext } from './context'
export { memo, isValidElement } from '../base'

import type { Props, Child, JSXNode } from '../base'
import { jsx } from './jsx-runtime'
export const cloneElement = <T extends JSXNode | JSX.Element>(
  element: T,
  props: Props,
  ...children: Child[]
): T => {
  return jsx(
    (element as JSXNode).tag,
    {
      ...(element as JSXNode).props,
      ...props,
      children: children.length ? children : (element as JSXNode).children,
    },
    (element as JSXNode).key
  ) as T
}
