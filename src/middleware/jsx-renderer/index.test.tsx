import { expectTypeOf } from 'vitest'
import { html } from '../../helper/html'
import { Hono } from '../../hono'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { jsx, Fragment, type FC } from '../../jsx'
import { jsxRenderer, useRequestContext } from '.'

const RequestUrl: FC = () => {
  const c = useRequestContext()
  return html`${c.req.url}`
}

describe('JSX renderer', () => {
  it('with layout', async () => {
    const app = new Hono()
    app.use(
      '*',
      jsxRenderer(({ children, title }) => (
        <html>
          <head>{title}</head>
          <body>{children}</body>
        </html>
      ))
    )
    app.get('/', (c) =>
      c.render(
        <h1>
          <RequestUrl />
        </h1>,
        { title: 'Title' }
      )
    )
    const res = await app.request('http://localhost/')
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(await res.text()).toBe(
      '<html><head>Title</head><body><h1>http://localhost/</h1></body></html>'
    )
  })

  it('without layout', async () => {
    const app = new Hono()
    app.use('*', jsxRenderer())
    app.get('/', (c) =>
      c.render(
        <h1>
          <RequestUrl />
        </h1>,
        { title: 'Title' }
      )
    )
    const res = await app.request('http://localhost/')
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('<h1>http://localhost/</h1>')
  })

  it('Env', async () => {
    type JSXRendererEnv = {
      Variables: {
        foo: string
      }
      Bindings: {
        bar: string
      }
    }

    const VariableFoo: FC = () => {
      const c = useRequestContext<JSXRendererEnv>()
      expectTypeOf(c.get('foo')).toEqualTypeOf<string>()
      return html`${c.get('foo')}`
    }

    const BindingsBar: FC = () => {
      const c = useRequestContext<JSXRendererEnv>()
      expectTypeOf(c.env.bar).toEqualTypeOf<string>()
      return html`${c.env.bar}`
    }

    const app = new Hono<JSXRendererEnv>()
    app.use('*', jsxRenderer())
    app.get('/', (c) => {
      c.set('foo', 'fooValue')
      return c.render(
        <>
          <h1>
            <VariableFoo />
          </h1>
          <p>
            <BindingsBar />
          </p>
        </>,
        { title: 'Title' }
      )
    })
    const res = await app.request('http://localhost/', undefined, { bar: 'barValue' })
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('<h1>fooValue</h1><p>barValue</p>')
  })
})
