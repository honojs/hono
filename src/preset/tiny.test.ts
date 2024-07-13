import { Hono } from './tiny'
import { getRouterName } from '../helper/dev'

describe('hono/tiny preset', () => {
  it('Should have PatternRouter', async () => {
    const app = new Hono()
    expect(getRouterName(app)).toBe('PatternRouter')
  })
})

describe('Generics for Bindings and Variables', () => {
  interface CloudflareBindings {
    MY_VARIABLE: 'my_value'
  }

  it('Should not throw type errors', () => {
    // @ts-expect-error Bindings should be Record<string, unknown> or interface
    new Hono<{
      Bindings: string[]
    }>()

    const appWithInterface = new Hono<{
      Bindings: CloudflareBindings
    }>()

    appWithInterface.get('/', (c) => {
      expectTypeOf(c.env.MY_VARIABLE).toMatchTypeOf<string>()
      return c.text('/')
    })

    const appWithType = new Hono<{
      Bindings: {
        foo: string
      }
    }>()

    appWithType.get('/', (c) => {
      expectTypeOf(c.env.foo).toMatchTypeOf<string>()
      return c.text('Hello Hono!')
    })
  })
})
