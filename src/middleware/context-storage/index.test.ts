import { Hono } from '../../hono'
import { contextStorage, getContext, tryGetContext } from '.'

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
  app.get('/optional', (c) => {
    const optionalContext = tryGetContext<Env>()
    return c.text(optionalContext?.var.message ?? 'no context')
  })

  const getMessage = () => {
    return getContext<Env>().var.message
  }

  it('Should get context', async () => {
    const res = await app.request('/')
    expect(await res.text()).toBe('Hono is hot!!')
  })

  it('Should return undefined when context is missing', () => {
    expect(tryGetContext<Env>()).toBeUndefined()
  })

  it('Should get context when available via tryGetContext', async () => {
    const res = await app.request('/optional')
    expect(await res.text()).toBe('Hono is hot!!')
  })
})
