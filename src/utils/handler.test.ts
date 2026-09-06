import type { Context } from '../context'
import type { Handler, MiddlewareHandler } from '../types'
import { COMPOSED_HANDLER } from './constants'
import { findTargetHandler, isMiddleware } from './handler'

describe('isMiddleware', () => {
  it('Should return false for a handler that only takes a context', () => {
    const handler: Handler = (c) => c.text('Hello')
    expect(isMiddleware(handler)).toBe(false)
  })

  it('Should return true for a handler that takes a context and next', () => {
    const middleware: MiddlewareHandler = async (_c, next) => await next()
    expect(isMiddleware(middleware)).toBe(true)
  })

  it('Should return false for a handler with no parameters', () => {
    const handler: Handler = () => new Response('Hello')
    expect(isMiddleware(handler)).toBe(false)
  })
})

describe('findTargetHandler', () => {
  it('Should return the handler itself if it is not composed', () => {
    const handler: Handler = (c) => c.text('Hello')
    expect(findTargetHandler(handler)).toBe(handler)
  })

  it('Should return the wrapped handler for a composed handler', () => {
    const target: Handler = (c) => c.text('Hello')
    const composed = Object.assign((c: Context) => c.text('Hello'), { [COMPOSED_HANDLER]: target })
    expect(findTargetHandler(composed)).toBe(target)
  })

  it('Should unwrap nested composed handlers down to the innermost target', () => {
    const target: Handler = (c) => c.text('Hello')
    const inner = Object.assign((c: Context) => c.text('Hello'), { [COMPOSED_HANDLER]: target })
    const outer = Object.assign((c: Context) => c.text('Hello'), { [COMPOSED_HANDLER]: inner })
    expect(findTargetHandler(outer)).toBe(target)
  })
})
