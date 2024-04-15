/**
 * All types exported from "hono/jsx" are in this file.
 */
import type { Child, JSXNode } from './base'

export type { Child, JSXNode, FC } from './base'
export type { RefObject } from './hooks'
export type { Context } from './context'

export type PropsWithChildren<P = unknown> = P & { children?: Child | undefined }
export type CSSProperties = Hono.CSSProperties

/**
 * React types
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ReactElement<P = any, T = string | Function> = JSXNode & {
  type: T
  props: P
  key: string | null
}
type ReactNode = ReactElement | string | number | boolean | null | undefined

export type { ReactElement, ReactNode }
