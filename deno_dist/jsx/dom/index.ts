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
} from '../hooks/index.ts'
export { render } from './render.ts'
export { Suspense, ErrorBoundary } from './components.ts'
export { useContext } from '../context.ts'
export type { Context } from '../context.ts'
export { createContext } from './context.ts'
export { memo, isValidElement } from '../base.ts'

import type { Props, Child, JSXNode } from '../base.ts'
import { jsx } from './jsx-runtime.ts'
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
