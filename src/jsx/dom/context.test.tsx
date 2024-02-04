import { JSDOM } from 'jsdom'
import { createContext as createContextCommon, useContext as useContextCommon } from '..' // for common
import { use, Suspense } from '..'
// run tests by old style jsx default
// hono/jsx/jsx-runtime and hono/jsx/dom/jsx-runtime are tested in their respective settings
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { jsx, Fragment } from '..'
import { createContext as createContextDom, useContext as useContextDom } from '.' // for dom
import { render } from '.'

runner('Common', createContextCommon, useContextCommon)
runner('DOM', createContextDom, useContextDom)

function runner(
  name: string,
  createContext: typeof createContextCommon,
  useContext: typeof useContextCommon
) {
  describe(name, () => {
    beforeAll(() => {
      global.requestAnimationFrame = (cb) => setTimeout(cb)
    })

    describe('Context', () => {
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

      it('simple context', async () => {
        const Context = createContext(0)
        const Content = () => {
          const num = useContext(Context)
          return <p>{num}</p>
        }
        const Component = () => {
          return (
            <Context.Provider value={1}>
              <Content />
            </Context.Provider>
          )
        }
        const App = <Component />
        render(App, root)
        expect(root.innerHTML).toBe('<p>1</p>')
      })

      it('multiple provider', async () => {
        const Context = createContext(0)
        const Content = () => {
          const num = useContext(Context)
          return <p>{num}</p>
        }
        const Component = () => {
          return (
            <>
              <Context.Provider value={1}>
                <Content />
              </Context.Provider>
              <Context.Provider value={2}>
                <Content />
              </Context.Provider>
            </>
          )
        }
        const App = <Component />
        render(App, root)
        expect(root.innerHTML).toBe('<p>1</p><p>2</p>')
      })

      it('nested provider', async () => {
        const Context = createContext(0)
        const Content = () => {
          const num = useContext(Context)
          return <p>{num}</p>
        }
        const Component = () => {
          return (
            <>
              <Context.Provider value={1}>
                <Content />
                <Context.Provider value={3}>
                  <Content />
                </Context.Provider>
                <Content />
              </Context.Provider>
            </>
          )
        }
        const App = <Component />
        render(App, root)
        expect(root.innerHTML).toBe('<p>1</p><p>3</p><p>1</p>')
      })

      it('inside Suspense', async () => {
        const promise = Promise.resolve(2)
        const AsyncComponent = () => {
          const num = use(promise)
          return <p>{num}</p>
        }
        const Context = createContext(0)
        const Content = () => {
          const num = useContext(Context)
          return <p>{num}</p>
        }
        const Component = () => {
          return (
            <>
              <Context.Provider value={1}>
                <Content />
                <Suspense fallback={<div>Loading...</div>}>
                  <Context.Provider value={3}>
                    <Content />
                    <AsyncComponent />
                  </Context.Provider>
                </Suspense>
                <Content />
              </Context.Provider>
            </>
          )
        }
        const App = <Component />
        render(App, root)
        expect(root.innerHTML).toBe('<p>1</p><div>Loading...</div><p>1</p>')
      })
    })
  })
}
