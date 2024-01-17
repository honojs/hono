import type { FC, Child } from '../index.ts'
import type { FallbackRender, ErrorHandler } from '../components.ts'
import { Fragment } from './jsx-runtime.ts'
import { ERROR_HANDLER } from './render.ts'

/* eslint-disable @typescript-eslint/no-explicit-any */
export const ErrorBoundary: FC<{
  fallback?: Child
  fallbackRender?: FallbackRender
  onError?: ErrorHandler
}> = (({ children, fallback, fallbackRender, onError }: any) => {
  const res = Fragment({ children })
  ;(res as any)[ERROR_HANDLER] = (err: any) => {
    if (err instanceof Promise) {
      throw err
    }
    onError?.(err)
    return fallbackRender?.(err) || fallback
  }
  return res
}) as any

export const Suspense: FC<{ fallback: any }> = (({ children, fallback }: any) => {
  const res = Fragment({ children })
  ;(res as any)[ERROR_HANDLER] = (err: any, retry: () => void) => {
    if (!(err instanceof Promise)) {
      throw err
    }
    err.then(retry).catch(retry)
    return fallback
  }
  return res
}) as any
/* eslint-enable @typescript-eslint/no-explicit-any */
