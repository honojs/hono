import { Hono } from '../../'
import { html } from '../../helper/html'
import { jsx, Fragment, JSXNode } from '../../jsx'
import { Suspense, renderToReadableStream } from '../../jsx/streaming'
import type { HtmlEscapedString } from '../../utils/html'
import { HtmlEscapedCallbackPhase, resolveCallback } from '../../utils/html'
import { css, cx, keyframes, rawCssString, Style, createCssContext } from './index'

async function toString(
  template: JSXNode | Promise<HtmlEscapedString> | Promise<string> | HtmlEscapedString
) {
  if (template instanceof Promise) template = (await template) as HtmlEscapedString
  if (template instanceof JSXNode) template = template.toString() as Promise<HtmlEscapedString>
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
  describe('render css', () => {
    it('Should render CSS styles with JSX', async () => {
      const headerClass = css`
        background-color: blue;
      `
      const template = (
        <>
          <Style />
          <h1 class={headerClass}>Hello!</h1>
        </>
      )
      expect(await toString(template)).toBe(
        '<style id="hono-css">.css-2458908649{background-color:blue}</style><h1 class="css-2458908649">Hello!</h1>'
      )
    })

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

    it('Should render CSS with keyframes', async () => {
      const animation = keyframes`
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      `
      const headerClass = css`
        background-color: blue;
        animation: ${animation} 1s ease-in-out;
      `
      const template = (
        <>
          <Style />
          <h1 class={headerClass}>Hello!</h1>
        </>
      )
      expect(await toString(template)).toBe(
        '<style id="hono-css">.css-1580801783{background-color:blue;animation:css-9294673 1s ease-in-out}@keyframes css-9294673{from{opacity:0}to{opacity:1}}</style><h1 class="css-1580801783">Hello!</h1>'
      )
    })

    it('Should not output the same class name multiple times.', async () => {
      const headerClass = css`
        background-color: blue;
      `
      const headerClass2 = css`
        background-color: blue;
      `
      const template = (
        <>
          <Style />
          <h1 class={headerClass}>Hello!</h1>
          <h1 class={headerClass2}>Hello2!</h1>
        </>
      )
      expect(await toString(template)).toBe(
        '<style id="hono-css">.css-2458908649{background-color:blue}</style><h1 class="css-2458908649">Hello!</h1><h1 class="css-2458908649">Hello2!</h1>'
      )
    })

    it('Should render CSS with variable', async () => {
      const headerClass = css`
        background-color: blue;
        content: '${'I\'m a variable!'}';
      `
      const template = (
        <>
          <Style />
          <h1 class={headerClass}>Hello!</h1>
        </>
      )
      expect(await toString(template)).toBe(
        '<style id="hono-css">.css-4027435072{background-color:blue;content:\'I\\\'m a variable!\'}</style><h1 class="css-4027435072">Hello!</h1>'
      )
    })

    it('Should escape </style>', async () => {
      const headerClass = css`
        background-color: blue;
        content: '${'</style>'}';
      `
      const template = (
        <>
          <Style />
          <h1 class={headerClass}>Hello!</h1>
        </>
      )
      expect(await toString(template)).toBe(
        '<style id="hono-css">.css-372954897{background-color:blue;content:\'<\\/style>\'}</style><h1 class="css-372954897">Hello!</h1>'
      )
    })

    it('Should not escape URL', async () => {
      const headerClass = css`
        background-color: blue;
        background: url('${'http://www.example.com/path/to/file.jpg'}');
      `
      const template = (
        <>
          <Style />
          <h1 class={headerClass}>Hello!</h1>
        </>
      )
      expect(await toString(template)).toBe(
        '<style id="hono-css">.css-1321888780{background-color:blue;background:url(\'http://www.example.com/path/to/file.jpg\')}</style><h1 class="css-1321888780">Hello!</h1>'
      )
    })

    it('Should render CSS with escaped variable', async () => {
      const headerClass = css`
        background-color: blue;
        content: '${rawCssString('say "Hello!"')}';
      `
      const template = (
        <>
          <Style />
          <h1 class={headerClass}>Hello!</h1>
        </>
      )
      expect(await toString(template)).toBe(
        '<style id="hono-css">.css-2238574885{background-color:blue;content:\'say "Hello!"\'}</style><h1 class="css-2238574885">Hello!</h1>'
      )
    })

    it('Should render CSS with async variable', async () => {
      const headerClass = css`
        background-color: blue;
        content: '${(async () => {
          await new Promise((resolve) => setTimeout(resolve, 100))
          return 'I\'m an async variable!'
        })()}';
      `
      const template = (
        <>
          <Style />
          <h1 class={headerClass}>Hello!</h1>
        </>
      )
      expect(await toString(template)).toBe(
        '<style id="hono-css">.css-1399451752{background-color:blue;content:\'I\\\'m an async variable!\'}</style><h1 class="css-1399451752">Hello!</h1>'
      )
    })

    it('Should render CSS with number', async () => {
      const headerClass = css`
        background-color: blue;
        font-size: ${1}rem;
      `
      const template = (
        <>
          <Style />
          <h1 class={headerClass}>Hello!</h1>
        </>
      )
      expect(await toString(template)).toBe(
        '<style id="hono-css">.css-1847536026{background-color:blue;font-size:1rem}</style><h1 class="css-1847536026">Hello!</h1>'
      )
    })

    it('Should render CSS with array', async () => {
      const animation = keyframes`
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      `
      const headerClass = css`
        background-color: blue;
        animation: ${animation} 1s ease-in-out;
      `
      const extendedHeaderClass = css`
        ${headerClass}
        color: red;
      `
      const template = (
        <>
          <Style />
          <h1 class={extendedHeaderClass}>Hello!</h1>
        </>
      )
      expect(await toString(template)).toBe(
        '<style id="hono-css">.css-2558359670{background-color:blue;animation:css-9294673 1s ease-in-out;color:red}@keyframes css-9294673{from{opacity:0}to{opacity:1}}</style><h1 class="css-2558359670">Hello!</h1>'
      )
    })

    describe('Booleans, Null, and Undefined Are Ignored', () => {
      it.each([true, false, undefined, null])('%s', async (value) => {
        const headerClass = css`
          ${value}
          background-color: blue;
        `
        const template = (
          <>
            <Style />
            <h1 class={headerClass}>Hello!</h1>
          </>
        )
        expect(await toString(template)).toBe(
          '<style id="hono-css">.css-2458908649{background-color:blue}</style><h1 class="css-2458908649">Hello!</h1>'
        )
      })

      it('falsy value', async () => {
        const value = 0
        const headerClass = css`
          padding: ${value};
        `
        const template = (
          <>
            <Style />
            <h1 class={headerClass}>Hello!</h1>
          </>
        )
        expect(await toString(template)).toBe(
          '<style id="hono-css">.css-478287868{padding:0}</style><h1 class="css-478287868">Hello!</h1>'
        )
      })
    })
  })

  it('Should render sub CSS with keyframe', async () => {
    const headerClass = css`
      background-color: blue;
      ${[1, 2].map(
        (i) =>
          css`
            :nth-child(${i}) {
              color: red;
            }
          `
      )}
    `
    const template = (
      <>
        <Style />
        <h1 class={headerClass}>Hello!</h1>
      </>
    )
    expect(await toString(template)).toBe(
      '<style id="hono-css">.css-1539881271{background-color:blue;:nth-child(1){color:red}:nth-child(2){color:red}}</style><h1 class="css-1539881271">Hello!</h1>'
    )
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
        `<style id="hono-css"></style><template id="H:0"></template><p>Loading...</p><!--/$--><script>document.querySelector('#hono-css').textContent+=".css-2458908649{background-color:blue}"</script><template><h1 class="css-2458908649">Hello!</h1></template><script>
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
