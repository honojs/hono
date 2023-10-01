import { html } from '../../helper/html'
import { Hono } from '../../hono'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { jsx, type FC } from '../../jsx'
import { jsxRenderer, useRequestContext } from '.'

const RequestUrl: FC = () => {
  const c = useRequestContext()
  return html`${c.req.url}`
}

describe('JSX renderer', () => {
  let app: Hono

  it('with layout', async () => {
    app = new Hono()
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
    app = new Hono()
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
})
