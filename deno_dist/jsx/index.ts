import { jsx, memo, Fragment, isValidElement, cloneElement } from './base.ts'
import type { DOMAttributes } from './base.ts'
import { Children } from './children.ts'
import { ErrorBoundary } from './components.ts'
import { createContext, useContext } from './context.ts'
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
  useInsertionEffect,
  useReducer,
  useId,
  useDebugValue,
  createRef,
  forwardRef,
  useImperativeHandle,
  useSyncExternalStore,
} from './hooks/index.ts'
import { Suspense } from './streaming.ts'

export {
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

// TODO: change to `export type *` after denoify bug is fixed
// https://github.com/garronej/denoify/issues/124
export * from './types.ts'
