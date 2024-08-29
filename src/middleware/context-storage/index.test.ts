import { Hono } from '../../hono'
import { contextStorage, getContext } from '.'

describe('Context Storage Middleware', () => {
  type Env = {
    Variables: {
      message: string
    }
  }

  let app: Hono<Env>

  beforeEach(() => {
    const { setContext } = contextStorage<Env>()
    app = new Hono()
    app.use(setContext)
    app.use(async (c, next) => {
      c.set('message', 'Hono is cool!!')
      await next()
    })
  })

  it('Should get context via getContext from contextStorage', async () => {
    const { getContext } = contextStorage<Env>()
    app.get('/', (c) => {
      return c.text(getMessage())
    })

    const getMessage = () => {
      return getContext().var.message
    }

    const res = await app.request('/')
    expect(await res.text()).toBe('Hono is cool!!')
  })

  it('Should get context via getContext directly imported', async () => {
    app.get('/', (c) => {
      return c.text(getMessage())
    })

    const getMessage = () => {
      return getContext<Env>().var.message
    }

    const res = await app.request('/')
    expect(await res.text()).toBe('Hono is cool!!')
  })
})
