import { HTTPException } from '../../http-exception'
import type { MiddlewareHandler } from '../../types'
import type { StatusCode } from '../../utils/http-status'

interface TimeoutOptions {
  errorMessage?: string
  errorCode?: StatusCode
}

const DEFAULT_ERROR_MESSAGE = 'Gateway Timeout'
const DEFAULT_ERROR_CODE = 504

export const timeout = (ms: number, options: TimeoutOptions = {}): MiddlewareHandler => {
  const errorMessage = options.errorMessage || DEFAULT_ERROR_MESSAGE
  const errorCode = options.errorCode || DEFAULT_ERROR_CODE

  return async (context, next) => {
    let timer: number | undefined

    const timeoutPromise = new Promise((_, reject) => {
      timer = setTimeout(() => {
        reject(new HTTPException(errorCode, { message: errorMessage }))
      }, ms) as unknown as number
    })

    try {
      await Promise.race([next(), timeoutPromise])
    } finally {
      if (timer !== undefined) {
        clearTimeout(timer)
      }
    }
  }
}
