import { HTTPException } from '../../http-exception'
import type { MiddlewareHandler } from '../../types'
import type { StatusCode } from '../../utils/http-status'

interface TimeoutOptions {
  errorMessage?: string
  errorCode?: StatusCode
}

const DEFAULT_ERROR_MESSAGE = 'Gateway Timeout'
const DEFAULT_ERROR_CODE = 504

interface DurationUnits {
  [key: string]: number
}

const parseDuration = (duration: string): number => {
  const units: DurationUnits = { ms: 1, s: 1000, m: 60000, h: 3600000 }
  const pattern = /(\d+)(ms|s|m|h)/g
  let totalMilliseconds = 0

  let match: RegExpExecArray | null
  while ((match = pattern.exec(duration)) !== null) {
    const value = parseInt(match[1], 10)
    const unit = match[2]

    if (!units[unit]) {
      throw new Error(`Unsupported time unit: ${unit}`)
    }
    totalMilliseconds += value * units[unit]
  }

  return totalMilliseconds
}

export const timeout = (
  duration: number | string,
  options: TimeoutOptions = {}
): MiddlewareHandler => {
  const errorMessage = options.errorMessage ?? DEFAULT_ERROR_MESSAGE
  const errorCode = options.errorCode ?? DEFAULT_ERROR_CODE
  const ms = typeof duration === 'string' ? parseDuration(duration) : duration

  return async (context, next) => {
    let timer: number | undefined

    const timeoutPromise = new Promise<void>((_, reject) => {
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
