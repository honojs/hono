import { getRouterName } from '../helper/dev'
import { Hono } from './quick'

describe('hono/quick preset', () => {
  it('Should have SmartRouter + LinearRouter', async () => {
    const app = new Hono()
    expect(getRouterName(app)).toBe('SmartRouter + LinearRouter')
  })
})

describe('Generics for Bindings and Variables', () => {
  interface CloudflareBindings {
    MY_VARIABLE: string
  }

  it('Should not throw type errors', () => {
    // @ts-expect-error Bindings should extend object
    new Hono<{
      Bindings: number
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
