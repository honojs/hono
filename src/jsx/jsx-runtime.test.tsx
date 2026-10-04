/** @jsxRuntime automatic **/
/** @jsxImportSource . **/

import { html, raw } from '../helper/html'
import { Hono } from '../hono'
import { HtmlEscapedCallbackPhase } from '../utils/html'
import type { HtmlEscapedCallback } from '../utils/html'
import { jsxAttr, jsxTemplate } from './jsx-runtime'
import { renderToReadableStream } from './streaming'

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
    expect(String(jsxAttr(invalidKey, (() => 'x') as never))).toBe('')
  })

  it('Should render valid attribute values in jsxAttr()', async () => {
    expect(String(jsxAttr('style', { fontSize: 10, color: 'red' }))).toBe(
      'style="font-size:10px;color:red"'
    )
    expect(String(await jsxAttr('href', Promise.resolve('/docs?q=1&lang=en')))).toBe(
      'href="/docs?q=1&amp;lang=en"'
    )
  })

  it('Should handle boolean attributes in jsxAttr()', () => {
    expect(String(jsxAttr('disabled', false as never))).toBe('')
    expect(String(jsxAttr('disabled', true as never))).toBe('disabled=""')
    // non-boolean attributes keep their value, matching JSXNode rendering
    expect(String(jsxAttr('data-flag', false as never))).toBe('data-flag="false"')
  })

  it.each(['shadowrootclonable', 'shadowrootdelegatesfocus', 'shadowrootserializable'])(
    'Should render %s only when true in jsxAttr()',
    (key) => {
      expect(String(jsxAttr(key, true as never))).toBe(`${key}=""`)
      expect(String(jsxAttr(key, false as never))).toBe('')
    }
  )

  it('Should escape a JSX node resolved from a promise attribute in jsxAttr()', async () => {
    expect(String(await jsxAttr('title', Promise.resolve(<img src='y' />) as never))).toBe(
      'title="&lt;img src=&quot;y&quot;/&gt;"'
    )
  })

  describe('precompiled JSX attribute values', () => {
    const input = 'x onmouseover=alert(1)//'
    const expected =
      'title="&lt;span data-label=&quot;x onmouseover=alert(1)//&quot;&gt;label&lt;/span&gt;"'

    it.each([
      ['a template', () => jsxTemplate`<span data-label="${input}">label</span>`],
      [
        'a promised template',
        () => Promise.resolve(jsxTemplate`<span data-label="${input}">label</span>`),
      ],
      [
        'an asynchronous template',
        () => jsxTemplate`<span data-label="${Promise.resolve(input)}">label</span>`,
      ],
    ])('Should escape %s in both attribute serializers', async (_name, createValue) => {
      const value = createValue()
      expect(String(await jsxAttr('title', value))).toBe(expected)
      expect(String(await (<div title={value as never}>outer</div>).toString())).toBe(
        `<div ${expected}>outer</div>`
      )
    })

    it('Should keep templates unescaped when rendered as children', async () => {
      const child = jsxTemplate`<span>${Promise.resolve('<label>')}</span>`
      expect(String(await jsxTemplate`<div>${child}</div>`)).toBe(
        '<div><span>&lt;label&gt;</span></div>'
      )
      expect(String(await (<div>{child}</div>).toString())).toBe(
        '<div><span>&lt;label&gt;</span></div>'
      )
    })

    it.each(['JSX node', 'precompiled template'])(
      'Should not propagate callbacks from a promised %s attribute',
      async (kind) => {
        const callback = vi.fn<HtmlEscapedCallback>(({ phase }) =>
          phase === HtmlEscapedCallbackPhase.Stream
            ? Promise.resolve('<b>callback output</b>')
            : undefined
        )
        const Async = async () => raw('inner', [callback])
        const value = Promise.resolve(
          kind === 'JSX node' ? (
            <span>
              <Async />
            </span>
          ) : (
            jsxTemplate`<span>${<Async />}</span>`
          )
        )

        for (const element of [
          <div title={value as never}>outer</div>,
          jsxTemplate`<div ${jsxAttr('title', value)}>outer</div>`,
        ]) {
          const output = await new Response(renderToReadableStream(element)).text()
          expect(callback).not.toHaveBeenCalled()
          expect(output).toBe('<div title="&lt;span&gt;inner&lt;/span&gt;">outer</div>')
        }

        // The same value must retain its callbacks when used as child content.
        const output = await new Response(renderToReadableStream(<div>{value}</div>)).text()
        expect(output).toBe('<div><span>inner</span></div><b>callback output</b>')
        expect(callback.mock.calls.map(([{ phase }]) => phase)).toEqual([
          HtmlEscapedCallbackPhase.BeforeStream,
          HtmlEscapedCallbackPhase.Stream,
        ])
      }
    )

    it.each([raw('&lt;label&gt;'), html`${'<label>'}`])(
      'Should preserve explicitly escaped attribute values',
      async (value) => {
        for (const attribute of [value, Promise.resolve(value)]) {
          expect(String(await jsxAttr('title', attribute))).toBe('title="&lt;label&gt;"')
          expect(String(await (<div title={attribute as never} />).toString())).toBe(
            '<div title="&lt;label&gt;"></div>'
          )
        }
      }
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
