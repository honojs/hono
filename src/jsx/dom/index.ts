import type { Props, Child, JSXNode } from '../base'
import { memo, isValidElement } from '../base'
import { Children } from '../children'
import { useContext } from '../context'
import {
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
  useReducer,
  useId,
  useDebugValue,
} from '../hooks'
import { Suspense, ErrorBoundary } from './components'
import { createContext } from './context'
import { jsx, Fragment } from './jsx-runtime'

export { render } from './render'

const createElement = (
  tag: string | ((props: Props) => JSXNode),
  props: Props,
  ...children: Child[]
): JSXNode => {
  const jsxProps: Props = { ...props, children }
  let key = undefined
  if ('key' in jsxProps) {
    key = jsxProps.key
    delete jsxProps.key
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return jsx(tag, jsxProps, key) as any
}

const cloneElement = <T extends JSXNode | JSX.Element>(
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

export {
  createElement as jsx,
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
  useReducer,
  useId,
  useDebugValue,
  Suspense,
  ErrorBoundary,
  createContext,
  useContext,
  memo,
  isValidElement,
  createElement,
  cloneElement,
  Children,
  Fragment,
}

export default {
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
  useReducer,
  useId,
  useDebugValue,
  Suspense,
  ErrorBoundary,
  createContext,
  useContext,
  memo,
  isValidElement,
  createElement,
  cloneElement,
  Children,
  Fragment,
}

export type { Context } from '../context'
