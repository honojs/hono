import { jsx, memo, Fragment, isValidElement, cloneElement } from './base'
import type { DOMAttributes } from './base'
import { Children } from './children'
import { ErrorBoundary } from './components'
import { createContext, useContext } from './context'
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
} from './hooks'
import { Suspense } from './streaming'

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
  Suspense,
  Children,
}

// TODO: change to `export type *` after denoify bug is fixed
// https://github.com/garronej/denoify/issues/124
export * from './types'
