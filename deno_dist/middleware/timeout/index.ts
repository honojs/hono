import type { Context } from '../../context.ts'
import { HTTPException } from '../../http-exception.ts'
import type { MiddlewareHandler } from '../../types.ts'

export type ExceptionFactory = (context: Context) => HTTPException

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
