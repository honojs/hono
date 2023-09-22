/* eslint-disable @typescript-eslint/no-explicit-any */
import { Context, type ContextRenderer } from './context'
import { html } from './helper/html'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { jsx, type FC } from './jsx'
import { createRenderer, useRequestContext } from './jsx-renderer'
import { HonoRequest } from './request'

declare module './context' {
  interface ContextRenderer {
    (content: string, head?: { title: string }): Response
  }
}

const RequestUrl: FC = () => {
  const c = useRequestContext()
  return html`${c.req.url}`
}

describe('JSX renderer', () => {
  const req = new HonoRequest(new Request('http://localhost/'))
  let c: Context
  beforeEach(() => {
    c = new Context(req)
  })

  it('with wrapper', async () => {
    c.setRenderer(
      createRenderer<(...args: Parameters<ContextRenderer>) => string>(c, (children, head) => (
        <html>
          <head>{head?.title}</head>
          <body>{children}</body>
        </html>
      ))
    )

    const res = c.render(
      <h1>
        <RequestUrl />
      </h1>,
      { title: 'Title' }
    )
    expect(await res.text()).toBe(
      '<html><head>Title</head><body><h1>http://localhost/</h1></body></html>'
    )
  })

  it('without wrapper', async () => {
    c.setRenderer(createRenderer(c))
    const res = c.render(
      <h1>
        <RequestUrl />
      </h1>
    )
    expect(await res.text()).toBe('<h1>http://localhost/</h1>')
  })
})
