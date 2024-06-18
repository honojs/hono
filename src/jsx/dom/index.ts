/**
 * @module
 * This module provides APIs for `hono/jsx/dom`.
 */

import { isValidElement, memo, reactAPICompatVersion } from '../base'
import type { Child, DOMAttributes, JSX, JSXNode, Props } from '../base'
import { Children } from '../children'
import { useContext } from '../context'
import {
  createRef,
  forwardRef,
  startTransition,
  startViewTransition,
  use,
  useCallback,
  useDebugValue,
  useDeferredValue,
  useEffect,
  useId,
  useImperativeHandle,
  useInsertionEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
  useViewTransition,
} from '../hooks'
import { ErrorBoundary, Suspense } from './components'
import { createContext } from './context'
import { Fragment, jsx } from './jsx-runtime'
import { createPortal, flushSync } from './render'

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
  reactAPICompatVersion as version,
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
  useInsertionEffect,
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
  version: reactAPICompatVersion,
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
  useInsertionEffect,
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

export type * from '../types'
