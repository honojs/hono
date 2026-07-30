import { COMPOSED_HANDLER } from './constants'
import { findTargetHandler, isMiddleware } from './handler'

describe('isMiddleware', () => {
  it('returns false for a handler taking no or one argument', () => {
    expect(isMiddleware(() => {})).toBe(false)
    expect(isMiddleware((_c: unknown) => {})).toBe(false)
  })

  it('returns true for a handler taking two or more arguments', () => {
    expect(isMiddleware((_c: unknown, _next: unknown) => {})).toBe(true)
    expect(isMiddleware((_a: unknown, _b: unknown, _c: unknown) => {})).toBe(true)
  })
})

describe('findTargetHandler', () => {
  it('returns the handler itself when it is not composed', () => {
    const handler = () => {}
    expect(findTargetHandler(handler)).toBe(handler)
  })

  it('unwraps a single level of composition', () => {
    const target = () => {}
    const composed = Object.assign(() => {}, { [COMPOSED_HANDLER]: target })
    expect(findTargetHandler(composed)).toBe(target)
  })

  it('recursively unwraps nested composed handlers', () => {
    const target = () => {}
    const middle = Object.assign(() => {}, { [COMPOSED_HANDLER]: target })
    const outer = Object.assign(() => {}, { [COMPOSED_HANDLER]: middle })
    expect(findTargetHandler(outer)).toBe(target)
  })
})
