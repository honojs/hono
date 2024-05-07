import { HTTPException } from '../../http-exception'
import type { MiddlewareHandler } from '../../types'
import type { StatusCode } from '../../utils/http-status'

interface TimeoutOptions {
  message?: string
  code?: StatusCode
}

const DEFAULT_ERROR_MESSAGE = 'Gateway Timeout'
const DEFAULT_ERROR_CODE = 504

export const timeout = (
  duration: number,
  options: TimeoutOptions = {}
): MiddlewareHandler => {
  const errorMessage = options.message ?? DEFAULT_ERROR_MESSAGE
  const errorCode = options.code ?? DEFAULT_ERROR_CODE

  return async function timeout(context, next) {
    let timer: number | undefined

    const timeoutPromise = new Promise<void>((_, reject) => {
      timer = setTimeout(() => {
        reject(new HTTPException(errorCode, { message: errorMessage }))
      }, duration) as unknown as number
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
