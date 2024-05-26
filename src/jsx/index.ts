/**
 * @module
 * JSX for Hono.
 */

import { Fragment, cloneElement, isValidElement, jsx, memo, reactAPICompatVersion } from './base'
import type { DOMAttributes } from './base'
import { Children } from './children'
import { ErrorBoundary } from './components'
import { createContext, useContext } from './context'
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
} from './hooks'
import { Suspense } from './streaming'

export {
  reactAPICompatVersion as version,
  jsx,
  memo,
  Fragment,
  isValidElement,
  jsx as createElement,
  cloneElement,
  ErrorBoundary,
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  useReducer,
  useId,
  useDebugValue,
  use,
  startTransition,
  useTransition,
  useDeferredValue,
  startViewTransition,
  useViewTransition,
  useMemo,
  useLayoutEffect,
  useInsertionEffect,
  createRef,
  forwardRef,
  useImperativeHandle,
  useSyncExternalStore,
  Suspense,
  Children,
  DOMAttributes,
}

export default {
  version: reactAPICompatVersion,
  memo,
  Fragment,
  isValidElement,
  createElement: jsx,
  cloneElement,
  ErrorBoundary,
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  useReducer,
  useId,
  useDebugValue,
  use,
  startTransition,
  useTransition,
  useDeferredValue,
  startViewTransition,
  useViewTransition,
  useMemo,
  useLayoutEffect,
  useInsertionEffect,
  createRef,
  forwardRef,
  useImperativeHandle,
  useSyncExternalStore,
  Suspense,
  Children,
}

export type * from './types'
