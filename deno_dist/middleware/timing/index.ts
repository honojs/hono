import type { Context } from '../../context.ts'
import type { MiddlewareHandler } from '../../types.ts'
import '../../context.ts'

declare module '../../context.ts' {
  interface ContextVariableMap {
    metric?: {
      headers: string[]
      timers: Map<string, Timer>
    }
  }
}

interface Timer {
  description?: string
  start: number
}

interface TimingOptions {
  total: boolean
  enabled: boolean | ((c: Context) => boolean)
  totalDescription: string
  autoEnd: boolean
  crossOrigin: boolean | string
}

const getTime = () => {
  try {
    return performance.now()
  } catch {}
  return Date.now()
}

export const timing = (config?: Partial<TimingOptions>): MiddlewareHandler => {
  const options: TimingOptions = {
    ...{
      total: true,
      enabled: true,
      totalDescription: 'Total Response Time',
      autoEnd: true,
      crossOrigin: false,
    },
    ...config,
  }
  return async function timing(c, next) {
    const headers: string[] = []
    const timers = new Map<string, Timer>()
    c.set('metric', { headers, timers })

    if (options.total) {
      startTime(c, 'total', options.totalDescription)
    }
    await next()

    if (options.total) {
      endTime(c, 'total')
    }

    if (options.autoEnd) {
      timers.forEach((_, key) => endTime(c, key))
    }

    const enabled = typeof options.enabled === 'function' ? options.enabled(c) : options.enabled

    if (enabled) {
      c.res.headers.append('Server-Timing', headers.join(','))
      if (options.crossOrigin) {
        c.res.headers.append(
          'Timing-Allow-Origin',
          typeof options.crossOrigin === 'string' ? options.crossOrigin : '*'
        )
      }
    }
  }
}

interface SetMetric {
  (c: Context, name: string, value: number, description?: string, precision?: number): void

  (c: Context, name: string, description?: string): void
}

export const setMetric: SetMetric = (
  c: Context,
  name: string,
  valueDescription: number | string | undefined,
  description?: string,
  precision?: number
) => {
  const metrics = c.get('metric')
  if (!metrics) {
    console.warn('Metrics not initialized! Please add the `timing()` middleware to this route!')
    return
  }
  if (typeof valueDescription === 'number') {
    const dur = valueDescription.toFixed(precision || 1)

    const metric = description ? `${name};dur=${dur};desc="${description}"` : `${name};dur=${dur}`

    metrics.headers.push(metric)
  } else {
    // Value-less metric
    const metric = valueDescription ? `${name};desc="${valueDescription}"` : `${name}`

    metrics.headers.push(metric)
  }
}

export const startTime = (c: Context, name: string, description?: string) => {
  const metrics = c.get('metric')
  if (!metrics) {
    console.warn('Metrics not initialized! Please add the `timing()` middleware to this route!')
    return
  }
  metrics.timers.set(name, { description, start: getTime() })
}

export const endTime = (c: Context, name: string, precision?: number) => {
  const metrics = c.get('metric')
  if (!metrics) {
    console.warn('Metrics not initialized! Please add the `timing()` middleware to this route!')
    return
  }
  const timer = metrics.timers.get(name)
  if (!timer) {
    console.warn(`Timer "${name}" does not exist!`)
    return
  }
  const { description, start } = timer

  const duration = getTime() - start

  setMetric(c, name, duration, description, precision)
  metrics.timers.delete(name)
}
