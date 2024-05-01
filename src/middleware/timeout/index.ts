import type { Context } from '../../context'
import { HTTPException } from '../../http-exception'
import type { MiddlewareHandler } from '../../types'

const setTimer = (c: Context) => {
  c.set('startTime', Date.now())
}

export const timeout = (ms: number): MiddlewareHandler => {
  return async (c, next) => {
    setTimer(c)
    let timeoutReached = false

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        timeoutReached = true
        reject(new Error('Request timed out'))
      }, ms)
    })

    try {
      await Promise.race([next(), timeoutPromise])
    } catch (err) {
      if (timeoutReached) {
        throw new HTTPException(504, { message: 'Gateway Timeout' })
      }
      throw err  
    } finally {
      if (!timeoutReached) {
        clearTimeout(timeoutPromise as unknown as NodeJS.Timeout)
      }
    }
  }
}
