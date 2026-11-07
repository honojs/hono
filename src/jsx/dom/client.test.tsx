/** @jsxImportSource ../ */
import { JSDOM } from 'jsdom'
import { createPortal, useEffect, useRef, useState } from '.'
import DefaultExport, { createRoot, hydrateRoot } from './client'

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

describe('hydrateRoot with server-rendered HTML', () => {
  let dom: JSDOM
  let rootElement: HTMLElement
  let createElementSpy: ReturnType<typeof vi.spyOn>
  beforeEach(() => {
    dom = new JSDOM('<html><body><div id="root"></div></body></html>', {
      runScripts: 'dangerously',
    })
    global.document = dom.window.document
    global.HTMLElement = dom.window.HTMLElement
    global.SVGElement = dom.window.SVGElement
    global.Text = dom.window.Text
    rootElement = document.getElementById('root') as HTMLElement
    createElementSpy = vi.spyOn(dom.window.document, 'createElement')
  })

  const serverRender = (node: unknown) => {
    rootElement.innerHTML = (node as { toString(): string }).toString()
  }

  it('should reuse the elements rendered by the server', () => {
    const App = () => (
      <div>
        <h1>Hello</h1>
        <p>World</p>
      </div>
    )
    serverRender(<App />)
    const [div, h1, p] = [
      rootElement.firstChild,
      rootElement.querySelector('h1'),
      rootElement.querySelector('p'),
    ]
    hydrateRoot(rootElement, <App />)
    expect(rootElement.innerHTML).toBe('<div><h1>Hello</h1><p>World</p></div>')
    expect(rootElement.firstChild).toBe(div)
    expect(rootElement.querySelector('h1')).toBe(h1)
    expect(rootElement.querySelector('p')).toBe(p)
    expect(createElementSpy).not.toHaveBeenCalled()
  })

  it('should attach event handlers and update the adopted elements', async () => {
    const App = () => {
      const [count, setCount] = useState(0)
      return <button onClick={() => setCount(count + 1)}>count: {count}</button>
    }
    serverRender(<App />)
    const button = rootElement.querySelector('button') as HTMLButtonElement
    hydrateRoot(rootElement, <App />)
    expect(createElementSpy).not.toHaveBeenCalled()
    button.click()
    await Promise.resolve()
    expect(rootElement.innerHTML).toBe('<button>count: 1</button>')
    expect(rootElement.querySelector('button')).toBe(button)
  })

  it('should replace text that differs from the server', () => {
    serverRender(<p>server</p>)
    const p = rootElement.querySelector('p')
    hydrateRoot(rootElement, <p>client</p>)
    expect(rootElement.innerHTML).toBe('<p>client</p>')
    expect(rootElement.querySelector('p')).toBe(p)
    expect(createElementSpy).not.toHaveBeenCalled()
  })

  it('should update attributes that differ from the server', () => {
    serverRender(
      <p class='server' data-server='x' style='color: red'>
        attribute
      </p>
    )
    const p = rootElement.querySelector('p') as HTMLElement
    const setAttributeSpy = vi.spyOn(p, 'setAttribute')
    hydrateRoot(
      rootElement,
      <p class='client' id='attr' style='color: red'>
        attribute
      </p>
    )
    expect(p.getAttribute('class')).toBe('client')
    expect(p.getAttribute('id')).toBe('attr')
    expect(p.getAttribute('style')).toBe('color: red')
    expect(p.getAttribute('data-server')).toBe('x')
    expect(setAttributeSpy).toHaveBeenCalledTimes(2)
    expect(createElementSpy).not.toHaveBeenCalled()
  })

  it('should replace an element whose tag differs from the server', () => {
    serverRender(
      <div>
        <i>server</i>
        <span>after</span>
      </div>
    )
    const div = rootElement.querySelector('div')
    hydrateRoot(
      rootElement,
      <div>
        <b>client</b>
        <span>after</span>
      </div>
    )
    expect(rootElement.innerHTML).toBe('<div><b>client</b><span>after</span></div>')
    expect(rootElement.querySelector('div')).toBe(div)
    expect(createElementSpy).toHaveBeenCalledTimes(2)
  })

  it('should create the children that the server did not render', () => {
    serverRender(
      <ul>
        <li>1</li>
        <li>2</li>
      </ul>
    )
    const [first, second] = Array.from(rootElement.querySelectorAll('li'))
    hydrateRoot(
      rootElement,
      <ul>
        <li>1</li>
        <li>2</li>
        <li>3</li>
      </ul>
    )
    expect(rootElement.innerHTML).toBe('<ul><li>1</li><li>2</li><li>3</li></ul>')
    const items = Array.from(rootElement.querySelectorAll('li'))
    expect(items[0]).toBe(first)
    expect(items[1]).toBe(second)
    expect(createElementSpy).toHaveBeenCalledTimes(1)
  })

  it('should remove the children that the server rendered but the client does not', () => {
    serverRender(
      <ul>
        <li>1</li>
        <li>2</li>
      </ul>
    )
    const first = rootElement.querySelector('li')
    hydrateRoot(
      rootElement,
      <ul>
        <li>1</li>
      </ul>
    )
    expect(rootElement.innerHTML).toBe('<ul><li>1</li></ul>')
    expect(rootElement.querySelector('li')).toBe(first)
    expect(createElementSpy).not.toHaveBeenCalled()
  })

  it('should split the text that the server merged into one node', () => {
    const App = () => (
      <p>
        {'a'}
        {''}
        {1}
        {null}
        {false}
        {'b'} c
      </p>
    )
    serverRender(<App />)
    expect(rootElement.querySelector('p')?.childNodes.length).toBe(1)
    hydrateRoot(rootElement, <App />)
    expect(rootElement.innerHTML).toBe('<p>a1b c</p>')
    expect(createElementSpy).not.toHaveBeenCalled()

    const fragment = document.createDocumentFragment()
    createRoot(fragment).render(<App />)
    const rendered = Array.from(fragment.querySelector('p')!.childNodes).map((n) => n.textContent)
    const hydrated = Array.from(rootElement.querySelector('p')!.childNodes).map(
      (n) => n.textContent
    )
    expect(hydrated).toEqual(rendered)
  })

  it('should move a <title> left in place by the server into <head>', () => {
    const App = () => (
      <div>
        <title>Cases</title>
        <p>after</p>
      </div>
    )
    serverRender(<App />)
    const p = rootElement.querySelector('p')
    hydrateRoot(rootElement, <App />)
    expect(rootElement.innerHTML).toBe('<div><p>after</p></div>')
    expect(document.head.innerHTML).toBe('<title>Cases</title>')
    expect(rootElement.querySelector('p')).toBe(p)
    expect(createElementSpy).toHaveBeenCalledTimes(1)
    expect(createElementSpy).toHaveBeenCalledWith('title')
  })

  it('should not touch the inner HTML set by dangerouslySetInnerHTML', () => {
    const App = () => <div dangerouslySetInnerHTML={{ __html: '<em>raw</em>' }} />
    serverRender(<App />)
    const em = rootElement.querySelector('em')
    hydrateRoot(rootElement, <App />)
    expect(rootElement.innerHTML).toBe('<div><em>raw</em></div>')
    expect(rootElement.querySelector('em')).toBe(em)
    expect(createElementSpy).not.toHaveBeenCalled()
  })

  it('should set refs on the adopted elements', () => {
    const ref = { current: null as HTMLParagraphElement | null }
    const refFn = vi.fn()
    const App = () => (
      <>
        <p ref={ref}>object</p>
        <p ref={refFn}>function</p>
      </>
    )
    serverRender(<App />)
    const [objectP, functionP] = Array.from(rootElement.querySelectorAll('p'))
    hydrateRoot(rootElement, <App />)
    expect(ref.current).toBe(objectP)
    expect(refFn).toHaveBeenCalledWith(functionP)
    expect(rootElement.innerHTML).toBe('<p>object</p><p>function</p>')
    expect(createElementSpy).not.toHaveBeenCalled()
  })

  it('should set the value and checked state of the adopted inputs', () => {
    const App = () => (
      <>
        <input value='typed' />
        <input type='checkbox' checked />
      </>
    )
    serverRender(<App />)
    const [text, checkbox] = Array.from(rootElement.querySelectorAll('input'))
    hydrateRoot(rootElement, <App />)
    expect(text.value).toBe('typed')
    expect(checkbox.checked).toBe(true)
    expect(rootElement.querySelectorAll('input')[0]).toBe(text)
    expect(createElementSpy).not.toHaveBeenCalled()
  })

  it('should reuse SVG elements', () => {
    const App = () => (
      <svg viewBox='0 0 10 10'>
        <circle cx='5' cy='5' r='4' />
      </svg>
    )
    serverRender(<App />)
    const circle = rootElement.querySelector('circle')
    const createElementNSSpy = vi.spyOn(dom.window.document, 'createElementNS')
    hydrateRoot(rootElement, <App />)
    expect(rootElement.querySelector('circle')).toBe(circle)
    expect(createElementSpy).not.toHaveBeenCalled()
    expect(createElementNSSpy).not.toHaveBeenCalled()
  })

  it('should skip a portal while adopting', () => {
    const App = () => (
      <div>
        <p>before</p>
        {createPortal(<span>portal</span>, document.body)}
        <p>after</p>
      </div>
    )
    serverRender(<App />)
    const [before, after] = Array.from(rootElement.querySelectorAll('p'))
    hydrateRoot(rootElement, <App />)
    expect(rootElement.innerHTML).toBe('<div><p>before</p><p>after</p></div>')
    expect(document.body.lastChild?.nodeName).toBe('SPAN')
    expect(Array.from(rootElement.querySelectorAll('p'))).toEqual([before, after])
  })

  it('should toggle an element after hydration', async () => {
    const App = () => {
      const [shown, setShown] = useState(false)
      return (
        <div>
          <button onClick={() => setShown(!shown)}>toggle</button>
          {shown && <p>shown</p>}
          <p>last</p>
        </div>
      )
    }
    serverRender(<App />)
    hydrateRoot(rootElement, <App />)
    expect(createElementSpy).not.toHaveBeenCalled()
    const button = rootElement.querySelector('button') as HTMLButtonElement
    button.click()
    await Promise.resolve()
    expect(rootElement.innerHTML).toBe('<div><button>toggle</button><p>shown</p><p>last</p></div>')
    button.click()
    await Promise.resolve()
    expect(rootElement.innerHTML).toBe('<div><button>toggle</button><p>last</p></div>')
  })

  it('should run effects with the adopted elements', async () => {
    const App = () => {
      const ref = useRef<HTMLParagraphElement>(null)
      useEffect(() => {
        ref.current!.dataset.ref = 'ok'
      }, [])
      return <p ref={ref}>ref</p>
    }
    serverRender(<App />)
    const p = rootElement.querySelector('p')
    hydrateRoot(rootElement, <App />)
    await new Promise((resolve) => setTimeout(resolve))
    expect(rootElement.querySelector('p')).toBe(p)
    expect(rootElement.innerHTML).toBe('<p data-ref="ok">ref</p>')
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
