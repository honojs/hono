import { JSDOM } from 'jsdom'
// run tests by old style jsx default
// hono/jsx/jsx-runtime and hono/jsx/dom/jsx-runtime are tested in their respective settings
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { jsx } from '..'
import type { JSXNode } from '..'
import { Style, css, rawCssString, createCssContext } from '../../helper/css'
import { minify } from '../../helper/css/common'
import { renderTest } from '../../helper/css/common.case.test'
import { render } from '.'

describe('Style and css for jsx/dom', () => {
  beforeAll(() => {
    global.requestAnimationFrame = (cb) => setTimeout(cb)
  })

  let dom: JSDOM
  let root: HTMLElement
  beforeEach(() => {
    dom = new JSDOM('<html><body><div id="root"></div></body></html>', {
      runScripts: 'dangerously',
    })
    global.document = dom.window.document
    global.HTMLElement = dom.window.HTMLElement
    global.Text = dom.window.Text
    root = document.getElementById('root') as HTMLElement
  })

  it('<Style />', async () => {
    const App = () => {
      return (
        <div>
          <Style />
          <div
            class={css`
              color: red;
            `}
          >
            red
          </div>
        </div>
      )
    }
    render(<App />, root)
    expect(root.innerHTML).toBe(
      '<div><style id="hono-css"></style><div class="css-3142110215">red</div></div>'
    )
    await Promise.resolve()
    expect(root.querySelector('style')?.sheet?.cssRules[0].cssText).toBe(
      '.css-3142110215 {color: red;}'
    )
  })

  it('<Style>{css`global`}</Style>', async () => {
    const App = () => {
      return (
        <div>
          <Style>{css`
            color: red;
          `}</Style>
          <div
            class={css`
              color: red;
            `}
          >
            red
          </div>
        </div>
      )
    }
    render(<App />, root)
    expect(root.innerHTML).toBe(
      '<div><style id="hono-css">color:red</style><div class="css-3142110215">red</div></div>'
    )
  })
})

describe('render', () => {
  renderTest(() => {
    const cssContext = createCssContext({ id: 'hono-css' })

    const dom = new JSDOM('<html><body><div id="root"></div></body></html>', {
      runScripts: 'dangerously',
    })
    global.document = dom.window.document
    global.HTMLElement = dom.window.HTMLElement
    global.Text = dom.window.Text
    const root = document.getElementById('root') as HTMLElement

    const toString = async (node: JSXNode) => {
      render(node, root)
      await Promise.resolve()
      const style = root.querySelector('style')
      if (style) {
        style.textContent = minify(
          [...(style.sheet?.cssRules || [])].map((r) => r.cssText).join('') || ''
        )
      }
      return root.innerHTML
    }

    return {
      toString,
      rawCssString,
      ...cssContext,
      support: { nest: false },
    }
  })
})
