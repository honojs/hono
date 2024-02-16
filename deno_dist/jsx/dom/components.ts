import type { FC, PropsWithChildren, Child } from '../index.ts'
import type { FallbackRender, ErrorHandler } from '../components.ts'
import { DOM_ERROR_HANDLER } from '../constants.ts'
import { Fragment } from './jsx-runtime.ts'

/* eslint-disable @typescript-eslint/no-explicit-any */
export const ErrorBoundary: FC<
  PropsWithChildren<{
    fallback?: Child
    fallbackRender?: FallbackRender
    onError?: ErrorHandler
  }>
> = (({ children, fallback, fallbackRender, onError }: any) => {
  const res = Fragment({ children })
  ;(res as any)[DOM_ERROR_HANDLER] = (err: any) => {
    if (err instanceof Promise) {
      throw err
    }
    onError?.(err)
    return fallbackRender?.(err) || fallback
  }
  return res
}) as any

export const Suspense: FC<PropsWithChildren<{ fallback: any }>> = (({
  children,
  fallback,
}: any) => {
  const res = Fragment({ children })
  ;(res as any)[DOM_ERROR_HANDLER] = (err: any, retry: () => void) => {
    if (!(err instanceof Promise)) {
      throw err
    }
    err.finally(retry)
    return fallback
  }
  return res
}) as any
/* eslint-enable @typescript-eslint/no-explicit-any */
