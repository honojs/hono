import { JSDOM } from 'jsdom'
// run tests by old style jsx default
// hono/jsx/jsx-runtime and hono/jsx/dom/jsx-runtime are tested in their respective settings
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { jsx } from '..'
import { Style, css } from '../../helper/css'
import { render } from '.'

describe('Style and css', () => {
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
    // maybe rules are inserted to style[id="hono-css"]
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
