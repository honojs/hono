/**
 * All types exported from "hono/jsx" are in this file.
 */
import type { Child } from './base'

export type { Child, JSXNode, FC } from './base'
export type { RefObject } from './hooks'
export type { Context } from './context'

export type PropsWithChildren<P = unknown> = P & { children?: Child | undefined }
export type CSSProperties = Hono.CSSProperties
