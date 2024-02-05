import { JSDOM } from 'jsdom'
import { Suspense as SuspenseCommon, ErrorBoundary as ErrorBoundaryCommon } from '..' // for common
// run tests by old style jsx default
// hono/jsx/jsx-runtime and hono/jsx/dom/jsx-runtime are tested in their respective settings
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { jsx } from '..'
import { use, useState } from '../hooks'
import { Suspense as SuspenseDom, ErrorBoundary as ErrorBoundaryDom } from '.' // for dom
import { render } from '.'

runner('Common', SuspenseCommon, ErrorBoundaryCommon)
runner('DOM', SuspenseDom, ErrorBoundaryDom)

function runner(
  name: string,
  Suspense: typeof SuspenseDom,
  ErrorBoundary: typeof ErrorBoundaryDom
) {
  describe(name, () => {
    beforeAll(() => {
      global.requestAnimationFrame = (cb) => setTimeout(cb)
    })

    describe('Suspense', () => {
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

      it('has no lazy load content', async () => {
        const App = <Suspense fallback={<div>Loading...</div>}>Hello</Suspense>
        render(App, root)
        expect(root.innerHTML).toBe('Hello')
      })

      it('with use()', async () => {
        let resolve: (value: number) => void = () => {}
        const promise = new Promise<number>((_resolve) => (resolve = _resolve))
        const Content = () => {
          const num = use(promise)
          return <p>{num}</p>
        }
        const Component = () => {
          return (
            <Suspense fallback={<div>Loading...</div>}>
              <Content />
            </Suspense>
          )
        }
        const App = <Component />
        render(App, root)
        expect(root.innerHTML).toBe('<div>Loading...</div>')
        resolve(1)
        await new Promise((resolve) => setTimeout(resolve))
        expect(root.innerHTML).toBe('<p>1</p>')
      })

      it('with use() nested', async () => {
        let resolve: (value: number) => void = () => {}
        const promise = new Promise<number>((_resolve) => (resolve = _resolve))
        const Content = () => {
          const num = use(promise)
          return <p>{num}</p>
        }
        let resolve2: (value: number) => void = () => {}
        const promise2 = new Promise<number>((_resolve) => (resolve2 = _resolve))
        const Content2 = () => {
          const num = use(promise2)
          return <p>{num}</p>
        }
        const Component = () => {
          return (
            <Suspense fallback={<div>Loading...</div>}>
              <Content />
              <Suspense fallback={<div>More...</div>}>
                <Content2 />
              </Suspense>
            </Suspense>
          )
        }
        const App = <Component />
        render(App, root)
        expect(root.innerHTML).toBe('<div>Loading...</div>')
        resolve(1)
        await new Promise((resolve) => setTimeout(resolve))
        expect(root.innerHTML).toBe('<p>1</p><div>More...</div>')
        resolve2(2)
        await new Promise((resolve) => setTimeout(resolve))
        expect(root.innerHTML).toBe('<p>1</p><p>2</p>')
      })

      it('race condition', async () => {
        let resolve: (value: number) => void = () => {}
        const promise = new Promise<number>((_resolve) => (resolve = _resolve))
        const Content = () => {
          const num = use(promise)
          return <p>{num}</p>
        }
        const Component = () => {
          const [show, setShow] = useState(false)
          return (
            <div>
              <button onClick={() => setShow((s) => !s)}>{show ? 'Hide' : 'Show'}</button>
              {show && (
                <Suspense fallback={<div>Loading...</div>}>
                  <Content />
                </Suspense>
              )}
            </div>
          )
        }
        const App = <Component />
        render(App, root)
        expect(root.innerHTML).toBe('<div><button>Show</button></div>')
        root.querySelector('button')?.click()
        await Promise.resolve()
        expect(root.innerHTML).toBe('<div><button>Hide</button><div>Loading...</div></div>')
        root.querySelector('button')?.click()
        await Promise.resolve()
        expect(root.innerHTML).toBe('<div><button>Show</button></div>')
        root.querySelector('button')?.click()
        await Promise.resolve()
        expect(root.innerHTML).toBe('<div><button>Hide</button><div>Loading...</div></div>')
        resolve(2)
        await Promise.resolve()
        await Promise.resolve()
        expect(root.innerHTML).toBe('<div><button>Hide</button><p>2</p></div>')
      })
    })

    describe('ErrorBoundary', () => {
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

      it('has no error', async () => {
        const App = (
          <ErrorBoundary fallback={<div>Error</div>}>
            <div>OK</div>
          </ErrorBoundary>
        )
        render(App, root)
        expect(root.innerHTML).toBe('<div>OK</div>')
      })

      it('has error', async () => {
        const Component = () => {
          throw new Error('error')
        }
        const App = (
          <ErrorBoundary fallback={<div>Error</div>}>
            <Component />
          </ErrorBoundary>
        )
        render(App, root)
        expect(root.innerHTML).toBe('<div>Error</div>')
      })

      it('has no error with Suspense', async () => {
        let resolve: (value: number) => void = () => {}
        const promise = new Promise<number>((_resolve) => (resolve = _resolve))
        const Content = () => {
          const num = use(promise)
          return <p>{num}</p>
        }
        const Component = () => {
          return (
            <ErrorBoundary fallback={<div>Error</div>}>
              <Suspense fallback={<div>Loading...</div>}>
                <Content />
              </Suspense>
            </ErrorBoundary>
          )
        }
        const App = <Component />
        render(App, root)
        expect(root.innerHTML).toBe('<div>Loading...</div>')
        resolve(1)
        await new Promise((resolve) => setTimeout(resolve))
        expect(root.innerHTML).toBe('<p>1</p>')
      })

      it('has error with Suspense', async () => {
        let resolve: (value: number) => void = () => {}
        const promise = new Promise<number>((_resolve) => (resolve = _resolve))
        const Content = () => {
          use(promise)
          throw new Error('error')
        }
        const Component = () => {
          return (
            <ErrorBoundary fallback={<div>Error</div>}>
              <Suspense fallback={<div>Loading...</div>}>
                <Content />
              </Suspense>
            </ErrorBoundary>
          )
        }
        const App = <Component />
        render(App, root)
        expect(root.innerHTML).toBe('<div>Loading...</div>')
        resolve(1)
        await new Promise((resolve) => setTimeout(resolve))
        expect(root.innerHTML).toBe('<div>Error</div>')
      })
    })
  })
}
