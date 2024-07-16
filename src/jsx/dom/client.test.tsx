/** @jsxImportSource ../ */
import { JSDOM } from 'jsdom'
import DefaultExport, { createRoot, hydrateRoot } from './client'
import { useEffect } from '.'

describe('createRoot', () => {
  beforeAll(() => {
    global.requestAnimationFrame = (cb) => setTimeout(cb)
  })

  let dom: JSDOM
  let rootElement: HTMLElement
  beforeEach(() => {
    dom = new JSDOM('<html><body><div id="root"></div></body></html>', {
      runScripts: 'dangerously',
    })
    global.document = dom.window.document
    global.HTMLElement = dom.window.HTMLElement
    global.SVGElement = dom.window.SVGElement
    global.Text = dom.window.Text
    rootElement = document.getElementById('root') as HTMLElement
  })

  it('render / unmount', async () => {
    const cleanup = vi.fn()
    const App = () => {
      useEffect(() => cleanup, [])
      return <h1>Hello</h1>
    }
    const root = createRoot(rootElement)
    root.render(<App />)
    expect(rootElement.innerHTML).toBe('<h1>Hello</h1>')
    await new Promise((resolve) => setTimeout(resolve))
    root.unmount()
    await Promise.resolve()
    expect(rootElement.innerHTML).toBe('')
    expect(cleanup).toHaveBeenCalled()
  })

  it('call render twice', async () => {
    const App = <h1>Hello</h1>
    const App2 = <h1>World</h1>
    const root = createRoot(rootElement)
    root.render(App)
    expect(rootElement.innerHTML).toBe('<h1>Hello</h1>')

    const createElementSpy = vi.spyOn(dom.window.document, 'createElement')

    root.render(App2)
    await Promise.resolve()
    expect(rootElement.innerHTML).toBe('<h1>World</h1>')

    expect(createElementSpy).not.toHaveBeenCalled()
  })

  it('call render after unmount', async () => {
    const App = <h1>Hello</h1>
    const App2 = <h1>World</h1>
    const root = createRoot(rootElement)
    root.render(App)
    expect(rootElement.innerHTML).toBe('<h1>Hello</h1>')
    root.unmount()
    expect(() => root.render(App2)).toThrow('Cannot update an unmounted root')
  })
})

describe('hydrateRoot', () => {
  let dom: JSDOM
  let rootElement: HTMLElement
  beforeEach(() => {
    dom = new JSDOM('<html><body><div id="root"></div></body></html>', {
      runScripts: 'dangerously',
    })
    global.document = dom.window.document
    global.HTMLElement = dom.window.HTMLElement
    global.SVGElement = dom.window.SVGElement
    global.Text = dom.window.Text
    rootElement = document.getElementById('root') as HTMLElement
  })

  it('should return root object', async () => {
    const cleanup = vi.fn()
    const App = () => {
      useEffect(() => cleanup, [])
      return <h1>Hello</h1>
    }
    const root = hydrateRoot(rootElement, <App />)
    expect(rootElement.innerHTML).toBe('<h1>Hello</h1>')
    await new Promise((resolve) => setTimeout(resolve))
    root.unmount()
    await Promise.resolve()
    expect(rootElement.innerHTML).toBe('')
    expect(cleanup).toHaveBeenCalled()
  })

  it('call render', async () => {
    const App = <h1>Hello</h1>
    const App2 = <h1>World</h1>
    const root = hydrateRoot(rootElement, App)
    expect(rootElement.innerHTML).toBe('<h1>Hello</h1>')

    const createElementSpy = vi.spyOn(dom.window.document, 'createElement')

    root.render(App2)
    await Promise.resolve()
    expect(rootElement.innerHTML).toBe('<h1>World</h1>')

    expect(createElementSpy).not.toHaveBeenCalled()
  })

  it('call render after unmount', async () => {
    const App = <h1>Hello</h1>
    const App2 = <h1>World</h1>
    const root = hydrateRoot(rootElement, App)
    expect(rootElement.innerHTML).toBe('<h1>Hello</h1>')
    root.unmount()
    expect(() => root.render(App2)).toThrow('Cannot update an unmounted root')
  })
})

describe('default export', () => {
  ;['createRoot', 'hydrateRoot'].forEach((key) => {
    it(key, () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((DefaultExport as any)[key]).toBeDefined()
    })
  })
})
