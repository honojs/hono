import { expectTypeOf } from 'vitest'
import { html } from '../../helper/html'
import { Hono } from '../../hono'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { jsx, Fragment } from '../../jsx'
import type { FC } from '../../jsx'
import { Suspense } from '../../jsx/streaming'
import { jsxRenderer, useRequestContext } from '.'

const RequestUrl: FC = () => {
  const c = useRequestContext()
  return html`${c.req.url}`
}

describe('JSX renderer', () => {
  it('basic', async () => {
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

    const app2 = new Hono()
    app2.use(
      '*',
      jsxRenderer(({ children }) => <div class='nested'>{children}</div>)
    )
    app2.get('/', (c) => c.render(<h1>http://localhost/nested</h1>, { title: 'Title' }))
    app.route('/nested', app2)

    let res = await app.request('http://localhost/')
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(await res.text()).toBe(
      '<!DOCTYPE html><html><head>Title</head><body><h1>http://localhost/</h1></body></html>'
    )

    res = await app.request('http://localhost/nested')
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(await res.text()).toBe(
      '<!DOCTYPE html><div class="nested"><h1>http://localhost/nested</h1></div>'
    )
  })

  it('nested layout with Layout', async () => {
    const app = new Hono()
    app.use(
      '*',
      jsxRenderer(({ children, title, Layout }) => (
        <Layout>
          <html>
            <head>{title}</head>
            <body>{children}</body>
          </html>
        </Layout>
      ))
    )

    const app2 = new Hono()
    app2.use(
      '*',
      jsxRenderer(({ children, Layout, title }) => (
        <Layout title={title}>
          <div class='nested'>{children}</div>
        </Layout>
      ))
    )
    app2.get('/', (c) => c.render(<h1>http://localhost/nested</h1>, { title: 'Nested' }))

    const app3 = new Hono()
    app3.use(
      '*',
      jsxRenderer(({ children, Layout, title }) => (
        <Layout title={title}>
          <div class='nested2'>{children}</div>
        </Layout>
      ))
    )
    app3.get('/', (c) => c.render(<h1>http://localhost/nested</h1>, { title: 'Nested2' }))
    app2.route('/nested2', app3)

    app.route('/nested', app2)

    let res = await app.request('http://localhost/nested')
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(await res.text()).toBe(
      '<!DOCTYPE html><html><head>Nested</head><body><div class="nested"><h1>http://localhost/nested</h1></div></body></html>'
    )

    res = await app.request('http://localhost/nested/nested2')
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(await res.text()).toBe(
      '<!DOCTYPE html><html><head>Nested2</head><body><div class="nested"><div class="nested2"><h1>http://localhost/nested</h1></div></div></body></html>'
    )
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

  it('Should return a non includes doctype', async () => {
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
        { docType: false }
      )
    )
    app.get('/', (c) => c.render(<h1>Hello</h1>, { title: 'Title' }))
    const res = await app.request('/')
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('<html><body><h1>Hello</h1></body></html>')
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
      `<template data-hono-target="H:0"><p>Hello Hono!</p></template><script>
((d,c,n) => {
c=d.currentScript.previousSibling
d=d.getElementById('H:0')
if(!d)return
do{n=d.nextSibling;n.remove()}while(n.nodeType!=8||n.nodeValue!='/$')
d.replaceWith(c.content)
})(document)
</script>`,
    ])
  })

  // this test relies upon 'Should return as streaming content with default headers'
  // this should be refactored to prevent tests depending on each other
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
            'Content-Type': 'text/html',
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
      `<template data-hono-target="H:1"><p>Hello Hono again!</p></template><script>
((d,c,n) => {
c=d.currentScript.previousSibling
d=d.getElementById('H:1')
if(!d)return
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
    expect(await res.text()).toBe('<!DOCTYPE html><h1>fooValue</h1><p>barValue</p>')
  })

  it('Should return a resolved content', async () => {
    const app = new Hono()
    app.use(jsxRenderer(async ({ children }) => <div>{children}</div>))
    app.get('/', (c) => c.render('Hi', { title: 'Hi' }))
    const res = await app.request('/')
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('<!DOCTYPE html><div>Hi</div>')
  })

  describe('keep context status', async () => {
    it('Should keep context status', async () => {
      const app = new Hono()
      app.use(
        '*',
        jsxRenderer(({ children }) => {
          return (
            <html>
              <body>{children}</body>
            </html>
          )
        })
      )
      app.get('/', (c) => {
        c.status(201)
        return c.render(<h1>Hello</h1>, { title: 'Title' })
      })
      const res = await app.request('/')
      expect(res).not.toBeNull()
      expect(res.status).toBe(201)
      expect(await res.text()).toBe('<!DOCTYPE html><html><body><h1>Hello</h1></body></html>')
    })

    it('Should keep context status with stream option', async () => {
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
          { stream: true }
        )
      )
      app.get('/', (c) => {
        c.status(201)
        return c.render(<h1>Hello</h1>, { title: 'Title' })
      })
      const res = await app.request('/')
      expect(res).not.toBeNull()
      expect(res.status).toBe(201)
      expect(await res.text()).toBe('<!DOCTYPE html><html><body><h1>Hello</h1></body></html>')
    })
  })
})
