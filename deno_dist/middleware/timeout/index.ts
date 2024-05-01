import { HTTPException } from '../../http-exception.ts'
import type { MiddlewareHandler } from '../../types.ts'
import type { StatusCode } from '../../utils/http-status.ts'

interface TimeoutOptions {
  errorMessage?: string
  errorCode?: StatusCode
}

export const timeout = (ms: number, options: TimeoutOptions = {}): MiddlewareHandler => {
  return async (c, next) => {
    let timer: NodeJS.Timeout | null = null

    const timeoutPromise = new Promise((_, reject) => {
      timer = setTimeout(() => {
        const message = options.errorMessage || 'Gateway Timeout'
        const statusCode = options.errorCode || 504
        reject(new HTTPException(statusCode, { message }))
      }, ms)
    })

    try {
      await Promise.race([next(), timeoutPromise])
    } finally {
      if (timer) {
        clearTimeout(timer)
      }
    }
  }
}
