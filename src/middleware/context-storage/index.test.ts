import { Hono } from '../../hono'
import { contextStorage, getContext } from '.'

describe('Context Storage Middleware', () => {
  type Env = {
    Variables: {
      message: string
    }
  }

  const app = new Hono<Env>()

  app.use(contextStorage())
  app.use(async (c, next) => {
    c.set('message', 'Hono is hot!!')
    await next()
  })
  app.get('/', (c) => {
    return c.text(getMessage())
  })

  const getMessage = () => {
    return getContext<Env>().var.message
  }

  it('Should get context', async () => {
    const res = await app.request('/')
    expect(await res.text()).toBe('Hono is hot!!')
  })
})
