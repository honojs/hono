import { memo, isValidElement } from '../base'
import type { Props, Child, DOMAttributes, JSXNode } from '../base'
import type { JSX } from '../base'
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
  createRef,
  forwardRef,
  useImperativeHandle,
  useSyncExternalStore,
} from '../hooks'
import { Suspense, ErrorBoundary } from './components'
import { createContext } from './context'
import { jsx, Fragment } from './jsx-runtime'
import { flushSync, createPortal } from './render'

export { render } from './render'

const createElement = (
  tag: string | ((props: Props) => JSXNode),
  props: Props | null,
  ...children: Child[]
): JSXNode => {
  const jsxProps: Props = props ? { ...props } : {}
  if (children.length) {
    jsxProps.children = children.length === 1 ? children[0] : children
  }

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
      children: children.length ? children : (element as JSXNode).props.children,
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
  createRef,
  forwardRef,
  useImperativeHandle,
  useSyncExternalStore,
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
  DOMAttributes,
  flushSync,
  createPortal,
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
  createRef,
  forwardRef,
  useImperativeHandle,
  useSyncExternalStore,
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
  flushSync,
  createPortal,
}

export type { Context } from '../context'

// TODO: change to `export type *` after denoify bug is fixed
// https://github.com/garronej/denoify/issues/124
export * from '../types'
