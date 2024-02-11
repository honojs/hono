import type { Props, Child, JSXNode } from '../base.ts'
import { memo, isValidElement } from '../base.ts'
import { useContext } from '../context.ts'
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
  useDebugValue,
} from '../hooks/index.ts'
import { Suspense, ErrorBoundary } from './components.ts'
import { createContext } from './context.ts'
import { jsx } from './jsx-runtime.ts'

export { render } from './render.ts'

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
  useDebugValue,
  Suspense,
  ErrorBoundary,
  createContext,
  useContext,
  memo,
  isValidElement,
  createElement,
  cloneElement,
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
  useDebugValue,
  Suspense,
  ErrorBoundary,
  createContext,
  useContext,
  memo,
  isValidElement,
  createElement,
  cloneElement,
}

export type { Context } from '../context.ts'
