import type { HonoBase } from '../hono-base.ts'

export function Stop(self: HonoBase, period?: number): boolean {
  if (self.stopped) {
    console.error('Already stopped')
    return false
  }

  // Stop
  self.stopped = true

  if (typeof period === 'number' && period !== -1) {
    setTimeout(() => {
      Resume(self, 0)
    }, period)
  }

  return true
}

export function Resume(self: HonoBase, delay: number = 0): boolean {
  if (!self.stopped) {
    console.error('Server is up and running')

    return false
  }

  setTimeout(() => {
    // Resume
    self.stopped = false
  }, delay)

  return true
}
