import type { FC, Child } from '..'
import type { FallbackRender, ErrorHandler } from '../components'
import { Fragment } from './jsx-runtime'
import { ERROR_HANDLER } from './render'

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
    err.finally(retry)
    return fallback
  }
  return res
}) as any
/* eslint-enable @typescript-eslint/no-explicit-any */
