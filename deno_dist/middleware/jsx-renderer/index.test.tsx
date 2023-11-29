import { expectTypeOf } from 'npm:vitest@0.34.3'
import { html } from '../../helper/html/index.ts'
import { Hono } from '../../hono.ts'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { jsx, Fragment } from '../../jsx/index.ts'
import type { FC } from '../../jsx/index.ts'
import { Suspense } from '../../jsx/streaming.ts'
import { jsxRenderer, useRequestContext } from './index.ts'

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

  it('Should return a default doctype', async () => {
    const app = new Hono()
    app.use(
      '*',
      jsxRenderer(
        ({ children }) => {
          return (
            <html>
              <body>{children}</body>
            </html>
          )
        },
        { docType: true }
      )
    )
    app.get('/', (c) => c.render(<h1>Hello</h1>, { title: 'Title' }))
    const res = await app.request('/')
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('<!DOCTYPE html><html><body><h1>Hello</h1></body></html>')
  })

  it('Should return a custom doctype', async () => {
    const app = new Hono()
    app.use(
      '*',
      jsxRenderer(
        ({ children }) => {
          return (
            <html>
              <body>{children}</body>
            </html>
          )
        },
        {
          docType:
            '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">',
        }
      )
    )
    app.get('/', (c) => c.render(<h1>Hello</h1>, { title: 'Title' }))
    const res = await app.request('/')
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(await res.text()).toBe(
      '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd"><html><body><h1>Hello</h1></body></html>'
    )
  })

  it('Should return as streaming content with default headers', async () => {
    const app = new Hono()
    app.use(
      '*',
      jsxRenderer(
        ({ children }) => {
          return (
            <html>
              <body>{children}</body>
            </html>
          )
        },
        {
          docType: true,
          stream: true,
        }
      )
    )
    const AsyncComponent = async () => {
      const c = useRequestContext()
      return <p>Hello {c.req.query('name')}!</p>
    }
    app.get('/', (c) =>
      c.render(
        <Suspense fallback={<p>Loading...</p>}>
          <AsyncComponent />
        </Suspense>,
        { title: 'Title' }
      )
    )
    const res = await app.request('/?name=Hono')
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(res.headers.get('Transfer-Encoding')).toEqual('chunked')
    expect(res.headers.get('Content-Type')).toEqual('text/html; charset=UTF-8')

    if (!res.body) {
      throw new Error('Body is null')
    }

    const chunk: string[] = []
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    for (;;) {
      const { value, done } = await reader.read()
      if (done) {
        break
      }
      chunk.push(decoder.decode(value))
    }
    expect(chunk).toEqual([
      '<!DOCTYPE html><html><body><template id="H:0"></template><p>Loading...</p><!--/$--></body></html>',
      `<template><p>Hello Hono!</p></template><script>
((d,c,n) => {
c=d.currentScript.previousSibling
d=d.getElementById('H:0')
do{n=d.nextSibling;n.remove()}while(n.nodeType!=8||n.nodeValue!='/$')
d.replaceWith(c.content)
})(document)
</script>`,
    ])
  })

  it('Should return as streaming content with custom headers', async () => {
    const app = new Hono()
    app.use(
      '*',
      jsxRenderer(
        ({ children }) => {
          return (
            <html>
              <body>{children}</body>
            </html>
          )
        },
        {
          docType: true,
          stream: {
            'Transfer-Encoding': 'chunked',
            'Content-Type': 'text/html'
          },
        }
      )
    )
    const AsyncComponent = async () => {
      const c = useRequestContext()
      return <p>Hello {c.req.query('name')} again!</p>
    }
    app.get('/', (c) =>
      c.render(
        <Suspense fallback={<p>Loading...</p>}>
          <AsyncComponent />
        </Suspense>,
        { title: 'Title' }
      )
    )
    const res = await app.request('/?name=Hono')
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(res.headers.get('Transfer-Encoding')).toEqual('chunked')
    expect(res.headers.get('Content-Type')).toEqual('text/html')

    if (!res.body) {
      throw new Error('Body is null')
    }

    const chunk: string[] = []
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    for (;;) {
      const { value, done } = await reader.read()
      if (done) {
        break
      }
      chunk.push(decoder.decode(value))
    }
    expect(chunk).toEqual([
      '<!DOCTYPE html><html><body><template id="H:1"></template><p>Loading...</p><!--/$--></body></html>',
      `<template><p>Hello Hono again!</p></template><script>
((d,c,n) => {
c=d.currentScript.previousSibling
d=d.getElementById('H:1')
do{n=d.nextSibling;n.remove()}while(n.nodeType!=8||n.nodeValue!='/$')
d.replaceWith(c.content)
})(document)
</script>`,
    ])
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
