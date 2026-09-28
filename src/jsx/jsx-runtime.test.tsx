/** @jsxRuntime automatic **/
/** @jsxImportSource . **/
import { Hono } from '../hono'
import { jsxAttr } from './jsx-runtime'

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

  it('Should render nothing for a null style object in jsxAttr()', () => {
    expect(String(jsxAttr('style', null as never))).toBe('')
  })

  it('Should handle boolean attributes in jsxAttr()', () => {
    expect(String(jsxAttr('disabled', false as never))).toBe('')
    expect(String(jsxAttr('disabled', true as never))).toBe('disabled=""')
    // non-boolean attributes keep their value, matching JSXNode rendering
    expect(String(jsxAttr('data-flag', false as never))).toBe('data-flag="false"')
  })

  it('Should skip function attribute values in jsxAttr()', () => {
    const handler = () => 'source'
    expect(String(jsxAttr('onclick', handler as never))).toBe('')
    expect(String(jsxAttr('ref', handler as never))).toBe('')
    expect(String(jsxAttr('data-x', handler as never))).toBe('')
  })

  it('Should escape a JSX node resolved from a promise attribute in jsxAttr()', async () => {
    expect(String(await jsxAttr('title', Promise.resolve(<img src='y' />) as never))).toBe(
      'title="&lt;img src=&quot;y&quot;/&gt;"'
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
