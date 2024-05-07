import type { Context } from '../../context'
import { HTTPException } from '../../http-exception'
import type { MiddlewareHandler } from '../../types'
import type { StatusCode } from '../../utils/http-status'

export type ExceptionFactory = (context: Context) => HTTPException

export const simpleTimeoutException = (code: StatusCode, message: string): ExceptionFactory => {
  return () => new HTTPException(code, { message })
}

const defaultTimeoutException = new HTTPException(504, {
  message: 'Gateway Timeout',
})

export const timeout = (
  duration: number,
  exception: ExceptionFactory | HTTPException = defaultTimeoutException
): MiddlewareHandler => {
  return async function timeout(context, next) {
    let timer: number | undefined
    const timeoutPromise = new Promise<void>((_, reject) => {
      timer = setTimeout(() => {
        reject(typeof exception === 'function' ? exception(context) : exception)
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
