/**
 * All types exported from "hono/jsx" are in this file.
 */
import type { Child } from './base.ts'

export type { Child, JSXNode, FC } from './base.ts'
export type { RefObject } from './hooks/index.ts'
export type { Context } from './context.ts'

export type PropsWithChildren<P = unknown> = P & { children?: Child | undefined }
export type CSSProperties = Hono.CSSProperties
