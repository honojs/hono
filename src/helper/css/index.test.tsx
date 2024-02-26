/* eslint-disable quotes */
import { Hono } from '../../'
import { html } from '../../helper/html'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { jsx, Fragment, isValidElement } from '../../jsx'
import type { JSXNode } from '../../jsx'
import { Suspense, renderToReadableStream } from '../../jsx/streaming'
import type { HtmlEscapedString } from '../../utils/html'
import { HtmlEscapedCallbackPhase, resolveCallback } from '../../utils/html'
import { renderTest } from './common.case.test'
import { css, cx, keyframes, viewTransition, rawCssString, Style, createCssContext } from './index'

async function toString(
  template: JSXNode | Promise<HtmlEscapedString> | Promise<string> | HtmlEscapedString
) {
  if (template instanceof Promise) {
    template = (await template) as HtmlEscapedString
  }
  if (isValidElement(template)) {
    template = template.toString() as Promise<HtmlEscapedString>
  }
  return resolveCallback(await template, HtmlEscapedCallbackPhase.Stringify, false, template)
}

async function toCSS(
  template: JSXNode | Promise<HtmlEscapedString> | Promise<string> | HtmlEscapedString
) {
  return (await toString(template))
    .replace(/.*?=(".*")<\/script.*/, '$1')
    .replace(/\.css-\d+/g, '.css-123')
}

describe('CSS Helper', () => {
  renderTest(() => {
    return {
      css,
      Style,
      keyframes,
      viewTransition,
      rawCssString,
      createCssContext,
      toString,
      toCSS,
      support: {
        nest: true,
      },
    }
  })

  describe('with `html` tag function', () => {
    it('Should render CSS styles with `html` tag function', async () => {
      const headerClass = css`
        background-color: blue;
      `
      const template = html`${Style()}
        <h1 class="${headerClass}">Hello!</h1>`
      expect(await toString(template)).toBe(
        `<style id="hono-css">.css-2458908649{background-color:blue}</style>
        <h1 class="css-2458908649">Hello!</h1>`
      )
    })
  })

  describe('cx()', () => {
    it('Should render CSS with cx()', async () => {
      const btn = css`
        border-radius: 4px;
      `
      const btnPrimary = css`
        background-color: blue;
        color: white;
      `

      const template = (
        <>
          <Style />
          <h1 class={cx(btn, btnPrimary)}>Hello!</h1>
        </>
      )
      expect(await toString(template)).toBe(
        '<style id="hono-css">.css-2395710522{border-radius:4px;background-color:blue;color:white}</style><h1 class="css-2395710522">Hello!</h1>'
      )
    })

    it('Should render CSS with cx() includes external class name', async () => {
      const btn = css`
        border-radius: 4px;
      `

      const template = (
        <>
          <Style />
          <h1 class={cx(btn, 'external-class')}>Hello!</h1>
        </>
      )
      expect(await toString(template)).toBe(
        '<style id="hono-css">.css-3467431616{border-radius:4px}</style><h1 class="css-3467431616 external-class">Hello!</h1>'
      )
    })

    it('Should render CSS with cx() includes nested external class name', async () => {
      const btn = css`
        border-radius: 4px;
      `
      const btn2 = cx(btn, 'external-class')
      const btn3 = css`
        ${btn2}
        color: white;
      `
      const btn4 = cx(btn3, 'external-class2')
      const template = (
        <>
          <Style />
          <h1 class={btn4}>Hello!</h1>
        </>
      )
      expect(await toString(template)).toBe(
        '<style id="hono-css">.css-3358636561{border-radius:4px;color:white}</style><h1 class="css-3358636561 external-class external-class2">Hello!</h1>'
      )
    })
  })

  describe('minify', () => {
    const data: [string, Promise<string>, string][] = [
      [
        'basic CSS styles',
        css`
          background-color: blue;
          color: white;
          padding: 1rem;
        `,
        '.css-123{background-color:blue;color:white;padding:1rem}',
      ],
      [
        'remove comments',
        css`
          /* background-color: blue; */
          color: white;
          padding: 1rem;
          // inline comment
          margin: 1rem;
        `,
        '.css-123{color:white;padding:1rem;margin:1rem}',
      ],
      [
        'preserve string',
        css`
          background-color: blue;
          color: white;
          padding: 1rem;
          content: "Hel  \\\n  \\'  lo!";
          content: 'Hel  \\\n  \\"  lo!';
        `,
        '.css-123{background-color:blue;color:white;padding:1rem;content:"Hel  \\\n  \\\'  lo!";content:\'Hel  \\\n  \\"  lo!\'}',
      ],
      [
        'preserve nested selectors',
        css`
          padding: 1rem;
          &:hover {
            padding: 2rem;
          }
        `,
        '.css-123{padding:1rem;&:hover{padding:2rem}}',
      ],
    ]
    data.forEach(([name, str, expected]) => {
      it(`Should be minified while preserving content accurately: ${name}`, async () => {
        expect(JSON.parse(await toCSS(str))).toBe(expected)
      })
    })
  })

  describe('createCssContext()', () => {
    it('Should create a new CSS context', async () => {
      const { css: css1, Style: Style1 } = createCssContext({ id: 'context1' })
      const { css: css2, Style: Style2 } = createCssContext({ id: 'context2' })
      const headerClass1 = css1`
        background-color: blue;
      `
      const headerClass2 = css2`
        background-color: red;
      `
      const template = (
        <>
          <Style1 />
          <Style2 />
          <h1 class={headerClass1}>Hello!</h1>
          <h1 class={headerClass2}>Hello!</h1>
        </>
      )
      expect(await toString(template)).toBe(
        '<style id="context1">.css-2458908649{background-color:blue}</style><style id="context2">.css-960045552{background-color:red}</style><h1 class="css-2458908649">Hello!</h1><h1 class="css-960045552">Hello!</h1>'
      )
    })
  })

  describe('with application', () => {
    const app = new Hono()

    const headerClass = css`
      background-color: blue;
    `

    app.get('/sync', (c) =>
      c.html(
        <>
          <Style />
          <h1 class={headerClass}>Hello!</h1>
        </>
      )
    )

    app.get('/stream', (c) => {
      const stream = renderToReadableStream(
        <>
          <Style />
          <Suspense fallback={<p>Loading...</p>}>
            <h1 class={headerClass}>Hello!</h1>
          </Suspense>
        </>
      )
      return c.body(stream, {
        headers: {
          'Content-Type': 'text/html; charset=UTF-8',
          'Transfer-Encoding': 'chunked',
        },
      })
    })

    it('/sync', async () => {
      const res = await app.request('http://localhost/sync')
      expect(res).not.toBeNull()
      expect(await res.text()).toBe(
        '<style id="hono-css">.css-2458908649{background-color:blue}</style><h1 class="css-2458908649">Hello!</h1>'
      )
    })

    it('/stream', async () => {
      const res = await app.request('http://localhost/stream')
      expect(res).not.toBeNull()
      expect(await res.text()).toBe(
        `<style id="hono-css"></style><template id="H:0"></template><p>Loading...</p><!--/$--><script>document.querySelector('#hono-css').textContent+=".css-2458908649{background-color:blue}"</script><template data-hono-target="H:0"><h1 class="css-2458908649">Hello!</h1></template><script>
((d,c,n) => {
c=d.currentScript.previousSibling
d=d.getElementById('H:0')
if(!d)return
do{n=d.nextSibling;n.remove()}while(n.nodeType!=8||n.nodeValue!='/$')
d.replaceWith(c.content)
})(document)
</script>`
      )
    })
  })
})
