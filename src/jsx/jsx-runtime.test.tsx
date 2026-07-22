/** @jsxRuntime automatic **/
/** @jsxImportSource . **/
import { html } from '../helper/html'
import { Hono } from '../hono'
import { createContext, useContext } from './context'
import { jsx, jsxAttr, jsxTemplate } from './jsx-runtime'

describe('jsx-runtime', () => {
  let app: Hono

  beforeEach(() => {
    app = new Hono()
  })

  it('Should render HTML strings', async () => {
    app.get('/', (c) => {
      return c.html(<h1>Hello</h1>)
    })
    const res = await app.request('http://localhost/')
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('text/html; charset=UTF-8')
    expect(await res.text()).toBe('<h1>Hello</h1>')
  })

  it('Should skip invalid attribute keys in jsxAttr()', () => {
    expect(String(jsxAttr('" onfocus="alert(1)', 'x'))).toBe('')
    expect(String(jsxAttr('foo<bar', 'x'))).toBe('')
    expect(String(jsxAttr('foo\\bar', 'x'))).toBe('')
    expect(String(jsxAttr('foo`bar', 'x'))).toBe('')
  })

  it('Should skip invalid non-string attribute values in jsxAttr()', async () => {
    const invalidKey = '" onfocus="alert(1)'

    expect(String(jsxAttr(invalidKey, { fontSize: 10 }))).toBe('')
    expect(String(await jsxAttr(invalidKey, Promise.resolve('/docs?q=1&lang=en')))).toBe('')
  })

  it('Should render valid attribute values in jsxAttr()', async () => {
    expect(String(jsxAttr('style', { fontSize: 10, color: 'red' }))).toBe(
      'style="font-size:10px;color:red"'
    )
    expect(String(await jsxAttr('href', Promise.resolve('/docs?q=1&lang=en')))).toBe(
      'href="/docs?q=1&amp;lang=en"'
    )
  })

  it('Should drop style values containing ";" in jsxAttr() to prevent CSS injection', () => {
    expect(
      String(jsxAttr('style', { color: 'red;background:blue', backgroundColor: 'white' }))
    ).toBe('style="background-color:white"')
  })

  it('Should drop style values that hide declaration separators in CSS comments in jsxAttr()', () => {
    expect(
      String(
        jsxAttr('style', {
          color: 'red/*(*/;background:blue;position:fixed;top:0',
          backgroundColor: 'white',
        })
      )
    ).toBe('style="background-color:white"')
  })

  it('Should drop style property names that can inject declarations in jsxAttr()', () => {
    expect(
      String(
        jsxAttr('style', {
          'color;background-image': 'url(https://attacker.example/a.png)',
          backgroundColor: 'white',
        })
      )
    ).toBe('style="background-color:white"')
  })

  // A precompiling JSX transform (e.g. Deno's `"jsx": "precompile"`) hoists
  // static elements into `jsxTemplate(tpl, ...children)` calls. Those calls are
  // argument expressions, so they are evaluated *before* the enclosing
  // component runs — rendering them eagerly would resolve their children
  // outside the tree position they belong to.
  describe('jsxTemplate()', () => {
    const tpl = (...strings: string[]) => strings

    it('Should render static chunks and interpolated values', () => {
      expect(jsxTemplate(tpl('<hr/>')).toString()).toBe('<hr/>')
      expect(jsxTemplate(tpl('<div>', '</div>'), 'hello').toString()).toBe('<div>hello</div>')
    })

    it('Should read context provided by an enclosing Provider', () => {
      const Context = createContext('default')
      const Consumer = () => <span>{useContext(Context)}</span>

      const node = jsx(Context.Provider, {
        value: 'provided',
        children: jsxTemplate(tpl('<div>', '</div>'), jsx(Consumer, {})),
      })

      expect(node.toString()).toBe('<div><span>provided</span></div>')
    })

    it('Should read context in an async component under a Provider', async () => {
      const Context = createContext('default')
      const Consumer = async () => <span>{useContext(Context)}</span>

      const node = jsx(Context.Provider, {
        value: 'provided',
        children: jsxTemplate(tpl('<div>', '</div>'), jsx(Consumer, {})),
      })

      expect(String(await node.toString())).toBe('<div><span>provided</span></div>')
    })

    it('Should render the same output as the equivalent JSX', async () => {
      const cases: [unknown, string][] = [
        ['<script>alert(1)</script>', 'escaped string'],
        [0, 'zero'],
        [42, 'number'],
        [true, 'true'],
        [false, 'false'],
        [null, 'null'],
        [undefined, 'undefined'],
        [['a', <b>b</b>, ['c', ['d']]], 'nested array'],
        [html`<b>bold &amp; raw</b>`, 'html fragment'],
      ]

      for (const [value, label] of cases) {
        const fromJsx = (<div>{value as never}</div>).toString()
        const fromTemplate = jsxTemplate(tpl('<div>', '</div>'), value as never).toString()
        expect(fromTemplate, label).toBe(fromJsx)
      }
    })

    it('Should resolve async children instead of stringifying the promise', async () => {
      const Async = async () => <span>async</span>
      const rendered = String(await jsxTemplate(tpl('<div>', '</div>'), jsx(Async, {})).toString())

      expect(rendered).toBe('<div><span>async</span></div>')
      expect(rendered).not.toContain('[object Promise]')
    })
  })

  // https://en.reactjs.org/docs/jsx-in-depth.html#booleans-null-and-undefined-are-ignored
  describe('Booleans, Null, and Undefined Are Ignored', () => {
    it.each([true, false, undefined, null])('%s', (item) => {
      expect((<span>{item}</span>).toString()).toBe('<span></span>')
    })

    it('falsy value', () => {
      const template = <span>{0}</span>
      expect(template.toString()).toBe('<span>0</span>')
    })
  })
})
