/** @jsxImportSource ../ */
import { JSDOM } from 'jsdom'
import type { Child, FC } from '..'
// run tests by old style jsx default
// hono/jsx/jsx-runtime and hono/jsx/dom/jsx-runtime are tested in their respective settings
import { createElement, jsx } from '..'
import type { RefObject } from '../hooks'
import {
  createRef,
  useCallback,
  useEffect,
  useInsertionEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from '../hooks'
import DefaultExport, {
  cloneElement,
  cloneElement as cloneElementForDom,
  createElement as createElementForDom,
  createPortal,
  flushSync,
  isValidElement,
  memo,
  render,
  version,
} from '.'

describe('Common', () => {
  ;[createElement, createElementForDom].forEach((createElement) => {
    describe('createElement', () => {
      it('simple', () => {
        const element = createElement('div', { id: 'app' })
        expect(element).toEqual(expect.objectContaining({ tag: 'div', props: { id: 'app' } }))
      })

      it('children', () => {
        const element = createElement('div', { id: 'app' }, 'Hello')
        expect(element).toEqual(
          expect.objectContaining({ tag: 'div', props: { id: 'app', children: 'Hello' } })
        )
      })

      it('multiple children', () => {
        const element = createElement('div', { id: 'app' }, 'Hello', 'World')
        expect(element).toEqual(
          expect.objectContaining({
            tag: 'div',
            props: { id: 'app', children: ['Hello', 'World'] },
          })
        )
      })

      it('key', () => {
        const element = createElement('div', { id: 'app', key: 'key' })
        expect(element).toEqual(
          expect.objectContaining({ tag: 'div', props: { id: 'app' }, key: 'key' })
        )
      })

      it('ref', () => {
        const ref = { current: null }
        const element = createElement('div', { id: 'app', ref })
        expect(element).toEqual(expect.objectContaining({ tag: 'div', props: { id: 'app', ref } }))
        expect(element.ref).toBe(ref)
      })

      it('type', () => {
        const element = createElement('div', { id: 'app' })
        expect(element.type).toBe('div')
      })

      it('null props', () => {
        const element = createElement('div', null)
        expect(element).toEqual(expect.objectContaining({ tag: 'div', props: {} }))
      })
    })
  })
})

describe('DOM', () => {
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
    global.SVGElement = dom.window.SVGElement
    global.Text = dom.window.Text
    root = document.getElementById('root') as HTMLElement
  })

  it('simple App', () => {
    const App = <h1>Hello</h1>
    render(App, root)
    expect(root.innerHTML).toBe('<h1>Hello</h1>')
  })

  it('replace', () => {
    dom.window.document.body.innerHTML = '<div id="root">Existing content</div>'
    root = document.getElementById('root') as HTMLElement
    const App = <h1>Hello</h1>
    render(App, root)
    expect(root.innerHTML).toBe('<h1>Hello</h1>')
  })

  it('render text directly', () => {
    const App = () => <>{'Hello'}</>
    render(<App />, root)
    expect(root.innerHTML).toBe('Hello')
  })

  describe('performance', () => {
    it('should be O(N) for each additional element', () => {
      const App = () => (
        <>
          {Array.from({ length: 1000 }, (_, i) => (
            <div>
              <span>{i}</span>
            </div>
          ))}
        </>
      )
      render(<App />, root)
      expect(root.innerHTML).toBe(
        Array.from({ length: 1000 }, (_, i) => `<div><span>${i}</span></div>`).join('')
      )
    })
  })

  describe('attribute', () => {
    it('simple', () => {
      const App = () => <div id='app' class='app' />
      render(<App />, root)
      expect(root.innerHTML).toBe('<div id="app" class="app"></div>')
    })

    it('boolean', () => {
      const App = () => <div hidden />
      render(<App />, root)
      expect(root.innerHTML).toBe('<div hidden=""></div>')
    })

    it('style', () => {
      const App = () => <div style={{ fontSize: '10px' }} />
      render(<App />, root)
      expect(root.innerHTML).toBe('<div style="font-size: 10px;"></div>')
    })

    it('update style', () => {
      const App = () => <div style={{ fontSize: '10px' }} />
      render(<App />, root)
      expect(root.innerHTML).toBe('<div style="font-size: 10px;"></div>')
    })

    it('style with CSS variables - 1', () => {
      const App = () => <div style={{ '--my-var-1': '15px' }} />
      render(<App />, root)
      expect(root.innerHTML).toBe('<div style="--my-var-1: 15px;"></div>')
    })

    it('style with CSS variables - 2', () => {
      const App = () => <div style={{ '--myVar-2': '20px' }} />
      render(<App />, root)
      expect(root.innerHTML).toBe('<div style="--myVar-2: 20px;"></div>')
    })

    it('style with string', async () => {
      const App = () => {
        const [style, setStyle] = useState<{ fontSize?: string; color?: string }>({
          fontSize: '10px',
        })
        return <div style={style} onClick={() => setStyle({ color: 'red' })} />
      }
      render(<App />, root)
      expect(root.innerHTML).toBe('<div style="font-size: 10px;"></div>')
      root.querySelector('div')?.click()
      await Promise.resolve()
      expect(root.innerHTML).toBe('<div style="color: red;"></div>')
    })

    it('toString() is called', () => {
      const App = () => <div x-value={{ toString: () => 'value' }} />
      render(<App />, root)
      expect(root.innerHTML).toBe('<div x-value="value"></div>')
    })

    it('ref', () => {
      const App = () => {
        const ref = useRef<HTMLDivElement>(null)
        return <div ref={ref} />
      }
      render(<App />, root)
      expect(root.innerHTML).toBe('<div></div>')
    })

    it('ref with callback', () => {
      const ref = useRef<HTMLDivElement>(null)
      const App = () => {
        return <div ref={(node: HTMLDivElement) => (ref.current = node)} />
      }
      render(<App />, root)
      expect(root.innerHTML).toBe('<div></div>')
      expect(ref.current).toBeInstanceOf(HTMLElement)
    })

    it('ref with null', () => {
      const App = () => {
        return <div ref={null} />
      }
      render(<App />, root)
      expect(root.innerHTML).toBe('<div></div>')
    })

    it('remove node with ref object', async () => {
      const ref = createRef<HTMLDivElement>()
      const App = () => {
        const [show, setShow] = useState(true)
        return (
          <>
            {show && <div ref={ref} />}
            <button onClick={() => setShow(false)}>remove</button>
          </>
        )
      }
      render(<App />, root)
      expect(root.innerHTML).toBe('<div></div><button>remove</button>')
      expect(ref.current).toBeInstanceOf(dom.window.HTMLDivElement)
      root.querySelector('button')?.click()
      await Promise.resolve()
      expect(root.innerHTML).toBe('<button>remove</button>')
      expect(ref.current).toBe(null)
    })

    it('remove node with ref function', async () => {
      const ref = vi.fn()
      const App = () => {
        const [show, setShow] = useState(true)
        return (
          <>
            {show && <div ref={ref} />}
            <button onClick={() => setShow(false)}>remove</button>
          </>
        )
      }
      render(<App />, root)
      expect(root.innerHTML).toBe('<div></div><button>remove</button>')
      expect(ref).toHaveBeenLastCalledWith(expect.any(dom.window.HTMLDivElement))
      root.querySelector('button')?.click()
      await Promise.resolve()
      expect(root.innerHTML).toBe('<button>remove</button>')
      expect(ref).toHaveBeenLastCalledWith(null)
    })

    it('ref cleanup function', async () => {
      const cleanup = vi.fn()
      const ref = vi.fn().mockReturnValue(cleanup)
      const App = () => {
        const [show, setShow] = useState(true)
        return (
          <>
            {show && <div ref={ref} />}
            <button onClick={() => setShow(false)}>remove</button>
          </>
        )
      }
      render(<App />, root)
      expect(root.innerHTML).toBe('<div></div><button>remove</button>')
      expect(ref).toHaveBeenLastCalledWith(expect.any(dom.window.HTMLDivElement))
      root.querySelector('button')?.click()
      await Promise.resolve()
      expect(root.innerHTML).toBe('<button>remove</button>')
      expect(ref).toBeCalledTimes(1)
      expect(cleanup).toBeCalledTimes(1)
    })
  })

  describe('child component', () => {
    it('simple', async () => {
      const Child = vi.fn(({ count }: { count: number }) => <div>{count}</div>)
      const App = () => {
        const [count, setCount] = useState(0)
        return (
          <>
            <div>{count}</div>
            <Child count={Math.floor(count / 2)} />
            <button onClick={() => setCount(count + 1)}>+</button>
          </>
        )
      }
      render(<App />, root)
      expect(root.innerHTML).toBe('<div>0</div><div>0</div><button>+</button>')
      expect(Child).toBeCalledTimes(1)
      root.querySelector('button')?.click()
      await Promise.resolve()
      expect(root.innerHTML).toBe('<div>1</div><div>0</div><button>+</button>')
      expect(Child).toBeCalledTimes(2)
      root.querySelector('button')?.click()
      await Promise.resolve()
      expect(root.innerHTML).toBe('<div>2</div><div>1</div><button>+</button>')
      expect(Child).toBeCalledTimes(3)
    })
  })

  describe('defaultProps', () => {
    it('simple', () => {
      const App: FC<{ name?: string }> = ({ name }) => <div>{name}</div>
      App.defaultProps = { name: 'default' }
      render(<App />, root)
      expect(root.innerHTML).toBe('<div>default</div>')
    })

    it('override', () => {
      const App: FC<{ name: string }> = ({ name }) => <div>{name}</div>
      App.defaultProps = { name: 'default' }
      render(<App name='override' />, root)
      expect(root.innerHTML).toBe('<div>override</div>')
    })
  })

  describe('replace content', () => {
    it('text to text', async () => {
      let setCount: (count: number) => void = () => {}
      const App = () => {
        const [count, _setCount] = useState(0)
        setCount = _setCount
        return <>{count}</>
      }
      render(<App />, root)
      expect(root.innerHTML).toBe('0')
      setCount(1)
      await Promise.resolve()
      expect(root.innerHTML).toBe('1')
    })

    it('text to element', async () => {
      let setCount: (count: number) => void = () => {}
      const App = () => {
        const [count, _setCount] = useState(0)
        setCount = _setCount
        return count === 0 ? <>{count}</> : <div>{count}</div>
      }
      render(<App />, root)
      expect(root.innerHTML).toBe('0')
      setCount(1)
      await Promise.resolve()
      expect(root.innerHTML).toBe('<div>1</div>')
    })

    it('element to element', async () => {
      let setCount: (count: number) => void = () => {}
      const App = () => {
        const [count, _setCount] = useState(0)
        setCount = _setCount
        return <div>{count}</div>
      }
      const app = <App />
      render(app, root)
      expect(root.innerHTML).toBe('<div>0</div>')

      const insertBeforeSpy = vi.spyOn(dom.window.Node.prototype, 'insertBefore')
      setCount(1)
      await Promise.resolve()
      expect(root.innerHTML).toBe('<div>1</div>')
      expect(insertBeforeSpy).not.toHaveBeenCalled()
    })

    it('element to text to element', async () => {
      let setCount: (count: number) => void = () => {}
      const App = () => {
        const [count, _setCount] = useState(0)
        setCount = _setCount
        return count % 2 === 0 ? <div>{count}</div> : <>{count}</>
      }
      render(<App />, root)
      expect(root.innerHTML).toBe('<div>0</div>')
      setCount(1)
      await Promise.resolve()
      expect(root.innerHTML).toBe('1')
      setCount(2)
      await Promise.resolve()
      expect(root.innerHTML).toBe('<div>2</div>')
    })

    it('text to child component to text', async () => {
      let setCount: (count: number) => void = () => {}
      const Child = () => {
        return <div>Child</div>
      }
      const App = () => {
        const [count, _setCount] = useState(0)
        setCount = _setCount
        return count % 2 === 0 ? <>{count}</> : <Child />
      }
      render(<App />, root)
      expect(root.innerHTML).toBe('0')
      setCount(1)
      await Promise.resolve()
      expect(root.innerHTML).toBe('<div>Child</div>')
      setCount(2)
      await Promise.resolve()
      expect(root.innerHTML).toBe('2')
    })

    it('one child is updated', async () => {
      let setCount: (count: number) => void = () => {}
      const App = () => {
        const [count, _setCount] = useState(0)
        setCount = _setCount
        return <div>{count}</div>
      }
      const app = (
        <>
          <App />
          <div>Footer</div>
        </>
      )
      render(app, root)
      expect(root.innerHTML).toBe('<div>0</div><div>Footer</div>')

      const insertBeforeSpy = vi.spyOn(dom.window.Node.prototype, 'insertBefore')
      setCount(1)
      await Promise.resolve()
      expect(root.innerHTML).toBe('<div>1</div><div>Footer</div>')
      expect(insertBeforeSpy).not.toHaveBeenCalled()
    })

    it('should not call insertBefore for unchanged complex dom tree', async () => {
      let setCount: (count: number) => void = () => {}
      const App = () => {
        const [count, _setCount] = useState(0)
        setCount = _setCount
        return (
          <form>
            <div>
              <label>label</label>
              <input />
            </div>
            <p>{count}</p>
          </form>
        )
      }
      const app = <App />

      render(app, root)
      expect(root.innerHTML).toBe('<form><div><label>label</label><input></div><p>0</p></form>')

      const insertBeforeSpy = vi.spyOn(dom.window.Node.prototype, 'insertBefore')
      setCount(1)
      await Promise.resolve()
      expect(root.innerHTML).toBe('<form><div><label>label</label><input></div><p>1</p></form>')
      expect(insertBeforeSpy).not.toHaveBeenCalled()
    })

    it('should not call textContent for unchanged text', async () => {
      let setCount: (count: number) => void = () => {}
      const App = () => {
        const [count, _setCount] = useState(0)
        setCount = _setCount
        return (
          <>
            <span>hono</span>
            <input value={count} />
          </>
        )
      }
      render(<App />, root)
      expect(root.innerHTML).toBe('<span>hono</span><input value="0">')
      setCount(1)

      const textContentSpy = vi.fn()
      Object.defineProperty(dom.window.Text.prototype, 'textContent', {
        set: textContentSpy,
      })
      await Promise.resolve()
      expect(root.innerHTML).toBe('<span>hono</span><input value="1">')
      expect(textContentSpy).not.toHaveBeenCalled()
    })
  })

  describe('children', () => {
    it('element', async () => {
      const Container = ({ children }: { children: Child }) => <div>{children}</div>
      const App = () => (
        <Container>
          <span>Content</span>
        </Container>
      )
      render(<App />, root)
      expect(root.innerHTML).toBe('<div><span>Content</span></div>')
    })

    it('array', async () => {
      const Container = ({ children }: { children: Child }) => <div>{children}</div>
      const App = () => <Container>{[<span>1</span>, <span>2</span>]}</Container>
      render(<App />, root)
      expect(root.innerHTML).toBe('<div><span>1</span><span>2</span></div>')
    })

    it('use the same children multiple times', async () => {
      const MultiChildren = ({ children }: { children: Child }) => (
        <>
          {children}
          <div>{children}</div>
        </>
      )
      const App = () => (
        <MultiChildren>
          <span>Content</span>
        </MultiChildren>
      )
      render(<App />, root)
      expect(root.innerHTML).toBe('<span>Content</span><div><span>Content</span></div>')
    })
  })

  describe('update properties', () => {
    describe('input', () => {
      it('value', async () => {
        let setValue: (value: string) => void = () => {}
        const App = () => {
          const [value, _setValue] = useState('a')
          setValue = _setValue
          return <input value={value} />
        }
        render(<App />, root)
        expect(root.innerHTML).toBe('<input value="a">')
        const valueSpy = vi.fn()
        Object.defineProperty(dom.window.HTMLInputElement.prototype, 'value', {
          set: valueSpy,
        })
        setValue('b')
        await Promise.resolve()
        expect(root.innerHTML).toBe('<input value="b">')
        expect(valueSpy).toHaveBeenCalledWith('b')
      })

      it('assign undefined', async () => {
        let setValue: (value: string | undefined) => void = () => {}
        const App = () => {
          const [value, _setValue] = useState<string | undefined>('a')
          setValue = _setValue
          return <input value={value} />
        }
        render(<App />, root)
        expect(root.innerHTML).toBe('<input value="a">')
        const valueSpy = vi.fn()
        Object.defineProperty(dom.window.HTMLInputElement.prototype, 'value', {
          set: valueSpy,
        })
        setValue(undefined)
        await Promise.resolve()
        expect(root.innerHTML).toBe('<input>')
        expect(valueSpy).toHaveBeenCalledWith(null) // assign null means empty string
      })

      it('checked', async () => {
        let setValue: (value: string) => void = () => {}
        const App = () => {
          const [value, _setValue] = useState('a')
          setValue = _setValue
          return <input type='checkbox' checked={value === 'b'} />
        }
        render(<App />, root)
        expect(root.innerHTML).toBe('<input type="checkbox">')
        const checkedSpy = vi.fn()
        Object.defineProperty(dom.window.HTMLInputElement.prototype, 'checked', {
          set: checkedSpy,
        })
        setValue('b')
        await Promise.resolve()
        expect(root.innerHTML).toBe('<input type="checkbox" checked="">')
        expect(checkedSpy).toHaveBeenCalledWith(true)
        setValue('a')
        await Promise.resolve()
        expect(root.innerHTML).toBe('<input type="checkbox">')
        expect(checkedSpy).toHaveBeenCalledWith(false)
      })
    })

    describe('textarea', () => {
      it('value', async () => {
        let setValue: (value: string) => void = () => {}
        const App = () => {
          const [value, _setValue] = useState('a')
          setValue = _setValue
          return <textarea value={value} />
        }
        render(<App />, root)
        expect(root.innerHTML).toBe('<textarea>a</textarea>')
        const valueSpy = vi.fn()
        Object.defineProperty(dom.window.HTMLTextAreaElement.prototype, 'value', {
          set: valueSpy,
        })
        setValue('b')
        await Promise.resolve()
        expect(root.innerHTML).toBe('<textarea>b</textarea>')
        expect(valueSpy).toHaveBeenCalledWith('b')
      })

      it('assign undefined', async () => {
        let setValue: (value: string | undefined) => void = () => {}
        const App = () => {
          const [value, _setValue] = useState<string | undefined>('a')
          setValue = _setValue
          return <textarea value={value} />
        }
        render(<App />, root)
        expect(root.innerHTML).toBe('<textarea>a</textarea>')
        const valueSpy = vi.fn()
        Object.defineProperty(dom.window.HTMLTextAreaElement.prototype, 'value', {
          set: valueSpy,
        })
        setValue(undefined)
        await Promise.resolve()
        expect(root.innerHTML).toBe('<textarea></textarea>')
        expect(valueSpy).toHaveBeenCalledWith(null) // assign null means empty string
      })
    })

    describe('select', () => {
      it('value', async () => {
        let setValue: (value: string) => void = () => {}
        const App = () => {
          const [value, _setValue] = useState('a')
          setValue = _setValue
          return (
            <select value={value}>
              <option value='a'>A</option>
              <option value='b'>B</option>
              <option value='c'>C</option>
            </select>
          )
        }
        render(<App />, root)
        expect(root.innerHTML).toBe(
          '<select><option value="a">A</option><option value="b">B</option><option value="c">C</option></select>'
        )
        const valueSpy = vi.fn()
        Object.defineProperty(dom.window.HTMLSelectElement.prototype, 'value', {
          set: valueSpy,
        })
        setValue('b')
        await Promise.resolve()
        expect(valueSpy).toHaveBeenCalledWith('b')
      })

      it('invalid value', async () => {
        let setValue: (value: string) => void = () => {}
        const App = () => {
          const [value, _setValue] = useState('a')
          setValue = _setValue
          return (
            <select value={value}>
              <option value='a'>A</option>
              <option value='b'>B</option>
              <option value='c'>C</option>
            </select>
          )
        }
        render(<App />, root)
        expect(root.innerHTML).toBe(
          '<select><option value="a">A</option><option value="b">B</option><option value="c">C</option></select>'
        )
        setValue('z')
        await Promise.resolve()
        const select = root.querySelector('select') as HTMLSelectElement
        expect(select.value).toBe('a') // invalid value is ignored
      })

      it('assign undefined', async () => {
        let setValue: (value: string | undefined) => void = () => {}
        const App = () => {
          const [value, _setValue] = useState<string | undefined>('a')
          setValue = _setValue
          return (
            <select value={value}>
              <option value='a'>A</option>
              <option value='b'>B</option>
              <option value='c'>C</option>
            </select>
          )
        }
        render(<App />, root)
        expect(root.innerHTML).toBe(
          '<select><option value="a">A</option><option value="b">B</option><option value="c">C</option></select>'
        )
        setValue(undefined)
        await Promise.resolve()
        const select = root.querySelector('select') as HTMLSelectElement
        expect(select.value).toBe('a') // select the first option
      })
    })

    describe('option', () => {
      it('selected', async () => {
        let setValue: (value: string) => void = () => {}
        const App = () => {
          const [value, _setValue] = useState('a')
          setValue = _setValue
          return (
            <select>
              <option value='a'>A</option>
              <option value='b' selected={value === 'b'}>
                B
              </option>
              <option value='c'>C</option>
            </select>
          )
        }
        render(<App />, root)
        expect(root.innerHTML).toBe(
          '<select><option value="a">A</option><option value="b">B</option><option value="c">C</option></select>'
        )
        setValue('b')
        await Promise.resolve()
        expect(root.innerHTML).toBe(
          '<select><option value="a">A</option><option value="b" selected="">B</option><option value="c">C</option></select>'
        )
        const select = root.querySelector('select') as HTMLSelectElement
        expect(select.value).toBe('b')
        setValue('a')
        await Promise.resolve()
        expect(root.innerHTML).toBe(
          '<select><option value="a">A</option><option value="b">B</option><option value="c">C</option></select>'
        )
        expect(select.value).toBe('a')
      })
    })
  })

  describe('dangerouslySetInnerHTML', () => {
    it('string', () => {
      const App = () => {
        return <div dangerouslySetInnerHTML={{ __html: '<p>Hello</p>' }} />
      }
      render(<App />, root)
      expect(root.innerHTML).toBe('<div><p>Hello</p></div>')
    })
  })

  describe('Event', () => {
    it('bubbling phase', async () => {
      const clicked: string[] = []
      const App = () => {
        return (
          <div
            onClick={() => {
              clicked.push('div')
            }}
          >
            <button
              onClick={() => {
                clicked.push('button')
              }}
            >
              Click
            </button>
          </div>
        )
      }
      render(<App />, root)
      expect(root.innerHTML).toBe('<div><button>Click</button></div>')
      root.querySelector('button')?.click()
      expect(clicked).toEqual(['button', 'div'])
    })

    it('ev.stopPropagation()', async () => {
      const clicked: string[] = []
      const App = () => {
        return (
          <div
            onClick={() => {
              clicked.push('div')
            }}
          >
            <button
              onClick={(ev) => {
                ev.stopPropagation()
                clicked.push('button')
              }}
            >
              Click
            </button>
          </div>
        )
      }
      render(<App />, root)
      expect(root.innerHTML).toBe('<div><button>Click</button></div>')
      root.querySelector('button')?.click()
      expect(clicked).toEqual(['button'])
    })

    it('capture phase', async () => {
      const clicked: string[] = []
      const App = () => {
        return (
          <div
            onClickCapture={(ev) => {
              ev.stopPropagation()
              clicked.push('div')
            }}
          >
            <button
              onClickCapture={() => {
                clicked.push('button')
              }}
            >
              Click
            </button>
          </div>
        )
      }
      render(<App />, root)
      expect(root.innerHTML).toBe('<div><button>Click</button></div>')
      root.querySelector('button')?.click()
      expect(clicked).toEqual(['div'])
    })

    it('remove capture phase event', async () => {
      const clicked: string[] = []
      const App = () => {
        const [canceled, setCanceled] = useState(false)
        return (
          <div
            {...(canceled
              ? {}
              : {
                  onClickCapture: () => {
                    clicked.push('div')
                  },
                })}
          >
            <button
              onClickCapture={() => {
                setCanceled(true)
                clicked.push('button')
              }}
            >
              Click
            </button>
          </div>
        )
      }
      render(<App />, root)
      expect(root.innerHTML).toBe('<div><button>Click</button></div>')
      root.querySelector('button')?.click()
      expect(clicked).toEqual(['div', 'button'])
      await Promise.resolve()
      root.querySelector('button')?.click()
      expect(clicked).toEqual(['div', 'button', 'button'])
    })

    it('onGotPointerCapture', async () => {
      const App = () => {
        return <div onGotPointerCapture={() => {}}></div>
      }
      const addEventListenerSpy = vi.spyOn(dom.window.Node.prototype, 'addEventListener')
      render(<App />, root)
      expect(addEventListenerSpy).toHaveBeenCalledOnce()
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'gotpointercapture',
        expect.any(Function),
        false
      )
    })

    it('onGotPointerCaptureCapture', async () => {
      const App = () => {
        return <div onGotPointerCaptureCapture={() => {}}></div>
      }
      const addEventListenerSpy = vi.spyOn(dom.window.Node.prototype, 'addEventListener')
      render(<App />, root)
      expect(addEventListenerSpy).toHaveBeenCalledOnce()
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'gotpointercapture',
        expect.any(Function),
        true
      )
    })

    it('undefined', async () => {
      const App = () => {
        return <div onClick={undefined}></div>
      }
      const addEventListenerSpy = vi.spyOn(dom.window.Node.prototype, 'addEventListener')
      render(<App />, root)
      expect(addEventListenerSpy).not.toHaveBeenCalled()
    })

    it('invalid event handler value', async () => {
      const App = () => {
        return <div onClick={1 as unknown as () => void}></div>
      }
      expect(() => render(<App />, root)).toThrow()
    })
  })

  it('simple Counter', async () => {
    const Counter = () => {
      const [count, setCount] = useState(0)
      return (
        <div>
          <p>Count: {count}</p>
          <button onClick={() => setCount(count + 1)}>+</button>
        </div>
      )
    }
    const app = <Counter />
    render(app, root)
    expect(root.innerHTML).toBe('<div><p>Count: 0</p><button>+</button></div>')
    const button = root.querySelector('button') as HTMLButtonElement
    button.click()
    await Promise.resolve()
    expect(root.innerHTML).toBe('<div><p>Count: 1</p><button>+</button></div>')
  })

  it('multiple useState()', async () => {
    let called = 0
    const Counter = () => {
      const [countA, setCountA] = useState(0)
      const [countB, setCountB] = useState(0)
      called++
      return (
        <div>
          <p>A: {countA}</p>
          <button onClick={() => setCountA(countA + 1)}>+</button>
          <p>B: {countB}</p>
          <button onClick={() => setCountB(countB + 1)}>+</button>
        </div>
      )
    }
    const app = <Counter />
    render(app, root)
    expect(root.innerHTML).toBe(
      '<div><p>A: 0</p><button>+</button><p>B: 0</p><button>+</button></div>'
    )
    expect(called).toBe(1)
    const [buttonA, buttonB] = root.querySelectorAll('button')
    for (let i = 0; i < 3; i++) {
      buttonA.click()
      await Promise.resolve()
    }
    for (let i = 0; i < 4; i++) {
      buttonB.click()
      await Promise.resolve()
    }
    expect(root.innerHTML).toBe(
      '<div><p>A: 3</p><button>+</button><p>B: 4</p><button>+</button></div>'
    )
    expect(called).toBe(8)
  })

  it('multiple update state calls at once in onClick attributes', async () => {
    let called = 0
    const Counter = () => {
      const [countA, setCountA] = useState(0)
      const [countB, setCountB] = useState(0)
      called++
      return (
        <div>
          <button
            onClick={() => {
              setCountA(countA + 1)
              setCountB(countB + 2)
            }}
          >
            +
          </button>
          {countA} {countB}
        </div>
      )
    }
    const app = <Counter />
    render(app, root)
    expect(root.innerHTML).toBe('<div><button>+</button>0 0</div>')
    expect(called).toBe(1)
    root.querySelector('button')?.click()
    expect(called).toBe(1)
    await Promise.resolve()
    expect(called).toBe(2)
  })

  it('multiple update state calls at once in dom events', async () => {
    let called = 0
    const Counter = () => {
      const [countA, setCountA] = useState(0)
      const [countB, setCountB] = useState(0)
      const buttonRef = useRef<HTMLButtonElement>(null)
      called++

      useEffect(() => {
        buttonRef.current?.addEventListener('click', () => {
          setCountA(countA + 1)
          setCountB(countB + 2)
        })
      }, [])

      return (
        <div>
          <button ref={buttonRef}>+</button>
          {countA} {countB}
        </div>
      )
    }
    const app = <Counter />
    render(app, root)
    expect(root.innerHTML).toBe('<div><button>+</button>0 0</div>')
    expect(called).toBe(1)
    await new Promise((resolve) => setTimeout(resolve))
    root.querySelector('button')?.click()
    expect(called).toBe(1)
    await Promise.resolve()
    expect(called).toBe(2)
  })

  it('nested useState()', async () => {
    const ChildCounter = () => {
      const [count, setCount] = useState(0)
      return (
        <div>
          <p>Child Count: {count}</p>
          <button onClick={() => setCount(count + 1)}>+</button>
        </div>
      )
    }
    const Counter = () => {
      const [count, setCount] = useState(0)
      return (
        <div>
          <p>Count: {count}</p>
          <button onClick={() => setCount(count + 1)}>+</button>
          <ChildCounter />
        </div>
      )
    }
    const app = <Counter />
    render(app, root)
    expect(root.innerHTML).toBe(
      '<div><p>Count: 0</p><button>+</button><div><p>Child Count: 0</p><button>+</button></div></div>'
    )
    const [button, childButton] = root.querySelectorAll('button')
    for (let i = 0; i < 3; i++) {
      childButton.click()
      await Promise.resolve()
    }
    for (let i = 0; i < 2; i++) {
      button.click()
      await Promise.resolve()
    }
    for (let i = 0; i < 3; i++) {
      childButton.click()
      await Promise.resolve()
    }
    for (let i = 0; i < 3; i++) {
      button.click()
      await Promise.resolve()
    }
    expect(root.innerHTML).toBe(
      '<div><p>Count: 5</p><button>+</button><div><p>Child Count: 6</p><button>+</button></div></div>'
    )
  })

  it('nested useState() with children', async () => {
    const ChildCounter = () => {
      const [count, setCount] = useState(0)
      return (
        <div>
          <p>Child Count: {count}</p>
          <button onClick={() => setCount(count + 1)}>+</button>
        </div>
      )
    }
    const Counter = ({ children }: { children: Child }) => {
      const [count, setCount] = useState(0)
      return (
        <div>
          <p>Count: {count}</p>
          <button onClick={() => setCount(count + 1)}>+</button>
          {children}
        </div>
      )
    }
    const app = (
      <Counter>
        <ChildCounter />
      </Counter>
    )
    render(app, root)
    expect(root.innerHTML).toBe(
      '<div><p>Count: 0</p><button>+</button><div><p>Child Count: 0</p><button>+</button></div></div>'
    )
    const [button, childButton] = root.querySelectorAll('button')
    for (let i = 0; i < 3; i++) {
      childButton.click()
      await Promise.resolve()
    }
    for (let i = 0; i < 2; i++) {
      button.click()
      await Promise.resolve()
    }
    for (let i = 0; i < 3; i++) {
      childButton.click()
      await Promise.resolve()
    }
    for (let i = 0; i < 3; i++) {
      button.click()
      await Promise.resolve()
    }
    expect(root.innerHTML).toBe(
      '<div><p>Count: 5</p><button>+</button><div><p>Child Count: 6</p><button>+</button></div></div>'
    )
  })

  it('consecutive fragment', async () => {
    const ComponentA = () => {
      const [count, setCount] = useState(0)
      return (
        <>
          <div>A: {count}</div>
          <button id='a-button' onClick={() => setCount(count + 1)}>
            A: +
          </button>
        </>
      )
    }
    const App = () => {
      const [count, setCount] = useState(0)
      return (
        <>
          <ComponentA />
          <div>B: {count}</div>
          <button id='b-button' onClick={() => setCount(count + 1)}>
            B: +
          </button>
        </>
      )
    }
    render(<App />, root)
    expect(root.innerHTML).toBe(
      '<div>A: 0</div><button id="a-button">A: +</button><div>B: 0</div><button id="b-button">B: +</button>'
    )
    root.querySelector<HTMLButtonElement>('#b-button')?.click()
    await Promise.resolve()
    expect(root.innerHTML).toBe(
      '<div>A: 0</div><button id="a-button">A: +</button><div>B: 1</div><button id="b-button">B: +</button>'
    )
    root.querySelector<HTMLButtonElement>('#a-button')?.click()
    await Promise.resolve()
    expect(root.innerHTML).toBe(
      '<div>A: 1</div><button id="a-button">A: +</button><div>B: 1</div><button id="b-button">B: +</button>'
    )
  })

  it('switch child component', async () => {
    const Even = () => <p>Even</p>
    const Odd = () => <div>Odd</div>
    const Counter = () => {
      const [count, setCount] = useState(0)
      return (
        <div>
          {count % 2 === 0 ? <Even /> : <Odd />}
          <button onClick={() => setCount(count + 1)}>+</button>
        </div>
      )
    }
    const app = <Counter />
    render(app, root)
    expect(root.innerHTML).toBe('<div><p>Even</p><button>+</button></div>')
    const button = root.querySelector('button') as HTMLButtonElement
    button.click()
    await Promise.resolve()
    expect(root.innerHTML).toBe('<div><div>Odd</div><button>+</button></div>')
    button.click()
    await Promise.resolve()
    expect(root.innerHTML).toBe('<div><p>Even</p><button>+</button></div>')
  })

  it('add/remove/swap item', async () => {
    const TodoApp = () => {
      const [todos, setTodos] = useState(['a', 'b', 'c'])
      return (
        <div>
          {todos.map((todo) => (
            <div key={todo}>{todo}</div>
          ))}
          <button onClick={() => setTodos([...todos, 'd'])}>add</button>
          <button onClick={() => setTodos(todos.slice(0, -1))}>remove</button>
          <button onClick={() => setTodos([todos[0], todos[2], todos[1], todos[3] || ''])}>
            swap
          </button>
        </div>
      )
    }
    const app = <TodoApp />
    render(app, root)
    expect(root.innerHTML).toBe(
      '<div><div>a</div><div>b</div><div>c</div><button>add</button><button>remove</button><button>swap</button></div>'
    )
    const [addButton] = root.querySelectorAll('button')
    addButton.click()
    await Promise.resolve()
    expect(root.innerHTML).toBe(
      '<div><div>a</div><div>b</div><div>c</div><div>d</div><button>add</button><button>remove</button><button>swap</button></div>'
    )
    const [, , swapButton] = root.querySelectorAll('button')
    swapButton.click()
    await Promise.resolve()
    expect(root.innerHTML).toBe(
      '<div><div>a</div><div>c</div><div>b</div><div>d</div><button>add</button><button>remove</button><button>swap</button></div>'
    )
    const [, removeButton] = root.querySelectorAll('button')
    removeButton.click()
    await Promise.resolve()
    expect(root.innerHTML).toBe(
      '<div><div>a</div><div>c</div><div>b</div><button>add</button><button>remove</button><button>swap</button></div>'
    )
  })

  it('swap deferent type of child component', async () => {
    const Even = () => <p>Even</p>
    const Odd = () => <div>Odd</div>
    const Counter = () => {
      const [count, setCount] = useState(0)
      return (
        <div>
          {count % 2 === 0 ? (
            <>
              <Even />
              <Odd />
            </>
          ) : (
            <>
              <Odd />
              <Even />
            </>
          )}
          <button onClick={() => setCount(count + 1)}>+</button>
        </div>
      )
    }
    const app = <Counter />
    render(app, root)
    expect(root.innerHTML).toBe('<div><p>Even</p><div>Odd</div><button>+</button></div>')
    const button = root.querySelector('button') as HTMLButtonElement

    const createElementSpy = vi.spyOn(dom.window.document, 'createElement')

    button.click()
    await Promise.resolve()
    expect(root.innerHTML).toBe('<div><div>Odd</div><p>Even</p><button>+</button></div>')
    button.click()
    await Promise.resolve()
    expect(root.innerHTML).toBe('<div><p>Even</p><div>Odd</div><button>+</button></div>')

    expect(createElementSpy).not.toHaveBeenCalled()
  })

  it('useState for unnamed function', async () => {
    const Input = ({ label, onInput }: { label: string; onInput: (value: string) => void }) => {
      return (
        <div>
          <label>{label}</label>
          <input
            onInput={(e: InputEvent) => onInput((e.target as HTMLInputElement)?.value || '')}
          />
        </div>
      )
    }
    const Form = () => {
      const [values, setValues] = useState<{ [key: string]: string }>({})
      return (
        <form>
          <Input label='Name' onInput={(value) => setValues({ ...values, name: value })} />
          <Input label='Email' onInput={(value) => setValues({ ...values, email: value })} />
          <span>{JSON.stringify(values)}</span>
        </form>
      )
    }
    const app = <Form />
    render(app, root)
    expect(root.innerHTML).toBe(
      '<form><div><label>Name</label><input></div><div><label>Email</label><input></div><span>{}</span></form>'
    )
    const [nameInput] = root.querySelectorAll('input')
    nameInput.value = 'John'
    nameInput.dispatchEvent(new dom.window.Event('input'))
    await Promise.resolve()
    expect(root.innerHTML).toBe(
      '<form><div><label>Name</label><input></div><div><label>Email</label><input></div><span>{"name":"John"}</span></form>'
    )
    const [, emailInput] = root.querySelectorAll('input')
    emailInput.value = 'john@example.com'
    emailInput.dispatchEvent(new dom.window.Event('input'))
    await Promise.resolve()
    expect(root.innerHTML).toBe(
      '<form><div><label>Name</label><input></div><div><label>Email</label><input></div><span>{"name":"John","email":"john@example.com"}</span></form>'
    )
  })

  it('useState for grand child function', async () => {
    const GrandChild = () => {
      const [count, setCount] = useState(0)
      return (
        <>
          {count === 0 ? <p>Zero</p> : <span>Not Zero</span>}
          <button onClick={() => setCount(count + 1)}>+</button>
        </>
      )
    }
    const Child = () => {
      return <GrandChild />
    }
    const App = () => {
      const [show, setShow] = useState(false)
      return (
        <div>
          {show && <Child />}
          <button onClick={() => setShow(!show)}>toggle</button>
        </div>
      )
    }
    render(<App />, root)
    expect(root.innerHTML).toBe('<div><button>toggle</button></div>')
    root.querySelector('button')?.click()
    await Promise.resolve()
    expect(root.innerHTML).toBe('<div><p>Zero</p><button>+</button><button>toggle</button></div>')
    root.querySelector('button')?.click()
    await Promise.resolve()
    expect(root.innerHTML).toBe(
      '<div><span>Not Zero</span><button>+</button><button>toggle</button></div>'
    )
  })

  describe('className', () => {
    it('should convert to class attribute for intrinsic elements', () => {
      const App = <h1 className='h1'>Hello</h1>
      render(App, root)
      expect(root.innerHTML).toBe('<h1 class="h1">Hello</h1>')
    })

    it('should convert to class attribute for custom elements', () => {
      const App = <custom-element className='h1'>Hello</custom-element>
      render(App, root)
      expect(root.innerHTML).toBe('<custom-element class="h1">Hello</custom-element>')
    })

    it('should not convert to class attribute for custom components', () => {
      const App: FC<{ className: string }> = ({ className }) => (
        <div data-class-name={className}>Hello</div>
      )
      render(<App className='h1' />, root)
      expect(root.innerHTML).toBe('<div data-class-name="h1">Hello</div>')
    })
  })

  describe('memo', () => {
    it('simple', async () => {
      let renderCount = 0
      const Counter = ({ count }: { count: number }) => {
        renderCount++
        return (
          <div>
            <p>Count: {count}</p>
          </div>
        )
      }
      const MemoCounter = memo(Counter)
      const App = () => {
        const [count, setCount] = useState(0)
        return (
          <div>
            <MemoCounter count={Math.min(count, 1)} />
            <button onClick={() => setCount(count + 1)}>+</button>
          </div>
        )
      }
      const app = <App />
      render(app, root)
      expect(root.innerHTML).toBe('<div><div><p>Count: 0</p></div><button>+</button></div>')
      expect(renderCount).toBe(1)
      root.querySelector('button')?.click()
      await Promise.resolve()
      expect(root.innerHTML).toBe('<div><div><p>Count: 1</p></div><button>+</button></div>')
      expect(renderCount).toBe(2)
      root.querySelector('button')?.click()
      await Promise.resolve()
      expect(root.innerHTML).toBe('<div><div><p>Count: 1</p></div><button>+</button></div>')
      expect(renderCount).toBe(2)
    })

    it('useState', async () => {
      const Child = vi.fn(({ count }: { count: number }) => {
        const [count2, setCount2] = useState(0)
        return (
          <>
            <div>
              {count} : {count2}
            </div>
            <button id='child-button' onClick={() => setCount2(count2 + 1)}>
              Child +
            </button>
          </>
        )
      })
      const MemoChild = memo(Child)
      const App = () => {
        const [count, setCount] = useState(0)
        return (
          <>
            <button id='app-button' onClick={() => setCount(count + 1)}>
              App +
            </button>
            <MemoChild count={Math.floor(count / 2)} />
          </>
        )
      }
      render(<App />, root)
      expect(root.innerHTML).toBe(
        '<button id="app-button">App +</button><div>0 : 0</div><button id="child-button">Child +</button>'
      )
      root.querySelector<HTMLButtonElement>('button#app-button')?.click()
      await Promise.resolve()
      expect(Child).toBeCalledTimes(1)
      expect(root.innerHTML).toBe(
        '<button id="app-button">App +</button><div>0 : 0</div><button id="child-button">Child +</button>'
      )
      root.querySelector<HTMLButtonElement>('button#app-button')?.click()
      await Promise.resolve()
      expect(Child).toBeCalledTimes(2)
      expect(root.innerHTML).toBe(
        '<button id="app-button">App +</button><div>1 : 0</div><button id="child-button">Child +</button>'
      )
      root.querySelector<HTMLButtonElement>('button#child-button')?.click()
      await Promise.resolve()
      expect(Child).toBeCalledTimes(3)
      expect(root.innerHTML).toBe(
        '<button id="app-button">App +</button><div>1 : 1</div><button id="child-button">Child +</button>'
      )
    })

    // The react compiler generates code like the following for memoization.
    it('react compiler', async () => {
      let renderCount = 0
      const Counter = ({ count }: { count: number }) => {
        renderCount++
        return (
          <div>
            <p>Count: {count}</p>
          </div>
        )
      }

      const App = () => {
        const [cache] = useState<unknown[]>(() => [])
        const [count, setCount] = useState(0)
        const countForDisplay = Math.floor(count / 2)

        let localCounter
        if (cache[0] !== countForDisplay) {
          localCounter = <Counter count={countForDisplay} />
          cache[0] = countForDisplay
          cache[1] = localCounter
        } else {
          localCounter = cache[1]
        }

        return (
          <div>
            {localCounter}
            <button onClick={() => setCount(count + 1)}>+</button>
          </div>
        )
      }
      const app = <App />
      render(app, root)
      expect(root.innerHTML).toBe('<div><div><p>Count: 0</p></div><button>+</button></div>')
      expect(renderCount).toBe(1)
      root.querySelector('button')?.click()
      await Promise.resolve()
      expect(root.innerHTML).toBe('<div><div><p>Count: 0</p></div><button>+</button></div>')
      expect(renderCount).toBe(1)
      root.querySelector('button')?.click()
      await Promise.resolve()
      expect(root.innerHTML).toBe('<div><div><p>Count: 1</p></div><button>+</button></div>')
      expect(renderCount).toBe(2)
    })
  })

  describe('useRef', async () => {
    it('simple', async () => {
      const Input = ({ label, ref }: { label: string; ref: RefObject<HTMLInputElement> }) => {
        return (
          <div>
            <label>{label}</label>
            <input ref={ref} />
          </div>
        )
      }
      const Form = () => {
        const [values, setValues] = useState<{ [key: string]: string }>({})
        const nameRef = useRef<HTMLInputElement>(null)
        const emailRef = useRef<HTMLInputElement>(null)
        return (
          <form>
            <Input label='Name' ref={nameRef} />
            <Input label='Email' ref={emailRef} />
            <button
              onClick={(ev: Event) => {
                ev.preventDefault()
                setValues({
                  name: nameRef.current?.value || '',
                  email: emailRef.current?.value || '',
                })
              }}
            >
              serialize
            </button>
            <span>{JSON.stringify(values)}</span>
          </form>
        )
      }
      const app = <Form />
      render(app, root)
      expect(root.innerHTML).toBe(
        '<form><div><label>Name</label><input></div><div><label>Email</label><input></div><button>serialize</button><span>{}</span></form>'
      )
      const [nameInput, emailInput] = root.querySelectorAll('input')
      nameInput.value = 'John'
      emailInput.value = 'john@example.com'
      const [button] = root.querySelectorAll('button')
      button.click()
      await Promise.resolve()
      expect(root.innerHTML).toBe(
        '<form><div><label>Name</label><input></div><div><label>Email</label><input></div><button>serialize</button><span>{"name":"John","email":"john@example.com"}</span></form>'
      )
    })

    it('update current', async () => {
      const App = () => {
        const [, setState] = useState(0)
        const ref = useRef<boolean>(false)
        return (
          <>
            <button
              onClick={() => {
                setState((c) => c + 1)
                ref.current = true
              }}
            >
              update
            </button>
            <span>{String(ref.current)}</span>
          </>
        )
      }
      const app = <App />
      render(app, root)
      expect(root.innerHTML).toBe('<button>update</button><span>false</span>')
      root.querySelector('button')?.click()
      await Promise.resolve()
      expect(root.innerHTML).toBe('<button>update</button><span>true</span>')
    })
  })

  describe('useEffect', () => {
    it('simple', async () => {
      const Counter = () => {
        const [count, setCount] = useState(0)
        useEffect(() => {
          setCount(count + 1)
        }, [])
        return <div>{count}</div>
      }
      const app = <Counter />
      render(app, root)
      await new Promise((resolve) => setTimeout(resolve))
      await Promise.resolve()
      expect(root.innerHTML).toBe('<div>1</div>')
    })

    it('multiple', async () => {
      const Counter = () => {
        const [count, setCount] = useState(0)
        useEffect(() => {
          setCount((c) => c + 1)
        }, [])
        useEffect(() => {
          setCount((c) => c + 1)
        }, [])
        return <div>{count}</div>
      }
      const app = <Counter />
      render(app, root)
      await new Promise((resolve) => setTimeout(resolve))
      await Promise.resolve()
      expect(root.innerHTML).toBe('<div>2</div>')
    })

    it('cleanup', async () => {
      const Child = ({ parent }: { parent: RefObject<HTMLElement> }) => {
        useEffect(() => {
          return () => {
            parent.current?.setAttribute('data-cleanup', 'true')
          }
        }, [])
        return <div>Child</div>
      }
      const Parent = () => {
        const [show, setShow] = useState(true)
        const ref = useRef<HTMLElement>(null)
        return (
          <div ref={ref}>
            {show && <Child parent={ref} />}
            <button onClick={() => setShow(false)}>hide</button>
          </div>
        )
      }
      const app = <Parent />
      render(app, root)
      expect(root.innerHTML).toBe('<div><div>Child</div><button>hide</button></div>')
      await new Promise((resolve) => setTimeout(resolve))
      const [button] = root.querySelectorAll('button')
      button.click()
      await Promise.resolve()
      expect(root.innerHTML).toBe('<div data-cleanup="true"><button>hide</button></div>')
    })

    it('cleanup for deps', async () => {
      let effectCount = 0
      let cleanupCount = 0

      const App = () => {
        const [count, setCount] = useState(0)
        const [count2, setCount2] = useState(0)
        useEffect(() => {
          effectCount++
          return () => {
            cleanupCount++
          }
        }, [count])
        return (
          <div>
            <p>{count}</p>
            <p>{count2}</p>
            <button onClick={() => setCount(count + 1)}>+</button>
            <button onClick={() => setCount2(count2 + 1)}>+</button>
          </div>
        )
      }
      const app = <App />
      render(app, root)
      await new Promise((resolve) => setTimeout(resolve))
      expect(effectCount).toBe(1)
      expect(cleanupCount).toBe(0)
      root.querySelectorAll('button')[0].click() // count++
      await Promise.resolve()
      await new Promise((resolve) => setTimeout(resolve))
      expect(effectCount).toBe(2)
      expect(cleanupCount).toBe(1)
      root.querySelectorAll('button')[1].click() // count2++
      await Promise.resolve()
      expect(effectCount).toBe(2)
      expect(cleanupCount).toBe(1)
    })
  })

  describe('useLayoutEffect', () => {
    it('simple', async () => {
      const Counter = () => {
        const [count, setCount] = useState(0)
        useLayoutEffect(() => {
          setCount(count + 1)
        }, [])
        return <div>{count}</div>
      }
      const app = <Counter />
      render(app, root)
      await Promise.resolve()
      expect(root.innerHTML).toBe('<div>1</div>')
    })

    it('multiple', async () => {
      const Counter = () => {
        const [count, setCount] = useState(0)
        useLayoutEffect(() => {
          setCount((c) => c + 1)
        }, [])
        useLayoutEffect(() => {
          setCount((c) => c + 1)
        }, [])
        return <div>{count}</div>
      }
      const app = <Counter />
      render(app, root)
      await Promise.resolve()
      expect(root.innerHTML).toBe('<div>2</div>')
    })

    it('cleanup', async () => {
      const Child = ({ parent }: { parent: RefObject<HTMLElement> }) => {
        useLayoutEffect(() => {
          return () => {
            parent.current?.setAttribute('data-cleanup', 'true')
          }
        }, [])
        return <div>Child</div>
      }
      const Parent = () => {
        const [show, setShow] = useState(true)
        const ref = useRef<HTMLElement>(null)
        return (
          <div ref={ref}>
            {show && <Child parent={ref} />}
            <button onClick={() => setShow(false)}>hide</button>
          </div>
        )
      }
      const app = <Parent />
      render(app, root)
      expect(root.innerHTML).toBe('<div><div>Child</div><button>hide</button></div>')
      const [button] = root.querySelectorAll('button')
      button.click()
      await Promise.resolve()
      expect(root.innerHTML).toBe('<div data-cleanup="true"><button>hide</button></div>')
    })

    it('cleanup for deps', async () => {
      let effectCount = 0
      let cleanupCount = 0

      const App = () => {
        const [count, setCount] = useState(0)
        const [count2, setCount2] = useState(0)
        useLayoutEffect(() => {
          effectCount++
          return () => {
            cleanupCount++
          }
        }, [count])
        return (
          <div>
            <p>{count}</p>
            <p>{count2}</p>
            <button onClick={() => setCount(count + 1)}>+</button>
            <button onClick={() => setCount2(count2 + 1)}>+</button>
          </div>
        )
      }
      const app = <App />
      render(app, root)
      expect(effectCount).toBe(1)
      expect(cleanupCount).toBe(0)
      root.querySelectorAll('button')[0].click() // count++
      await Promise.resolve()
      expect(effectCount).toBe(2)
      expect(cleanupCount).toBe(1)
      root.querySelectorAll('button')[1].click() // count2++
      await Promise.resolve()
      expect(effectCount).toBe(2)
      expect(cleanupCount).toBe(1)
    })
  })

  describe('useInsertionEffect', () => {
    it('simple', async () => {
      const Counter = () => {
        const [count, setCount] = useState(0)
        useInsertionEffect(() => {
          setCount(count + 1)
        }, [])
        return <div>{count}</div>
      }
      const app = <Counter />
      render(app, root)
      await Promise.resolve()
      expect(root.innerHTML).toBe('<div>1</div>')
    })

    it('multiple', async () => {
      const Counter = () => {
        const [count, setCount] = useState(0)
        useInsertionEffect(() => {
          setCount((c) => c + 1)
        }, [])
        useInsertionEffect(() => {
          setCount((c) => c + 1)
        }, [])
        return <div>{count}</div>
      }
      const app = <Counter />
      render(app, root)
      await Promise.resolve()
      expect(root.innerHTML).toBe('<div>2</div>')
    })

    it('with useLayoutEffect', async () => {
      const Counter = () => {
        const [data, setData] = useState<string[]>([])
        useLayoutEffect(() => {
          setData((d) => [...d, 'useLayoutEffect'])
        }, [])
        useInsertionEffect(() => {
          setData((d) => [...d, 'useInsertionEffect'])
        }, [])
        return <div>{data.join(',')}</div>
      }
      const app = <Counter />
      render(app, root)
      await Promise.resolve()
      expect(root.innerHTML).toBe('<div>useInsertionEffect,useLayoutEffect</div>')
    })

    it('cleanup', async () => {
      const Child = ({ parent }: { parent: RefObject<HTMLElement> }) => {
        useInsertionEffect(() => {
          return () => {
            parent.current?.setAttribute('data-cleanup', 'true')
          }
        }, [])
        return <div>Child</div>
      }
      const Parent = () => {
        const [show, setShow] = useState(true)
        const ref = useRef<HTMLElement>(null)
        return (
          <div ref={ref}>
            {show && <Child parent={ref} />}
            <button onClick={() => setShow(false)}>hide</button>
          </div>
        )
      }
      const app = <Parent />
      render(app, root)
      expect(root.innerHTML).toBe('<div><div>Child</div><button>hide</button></div>')
      const [button] = root.querySelectorAll('button')
      button.click()
      await Promise.resolve()
      expect(root.innerHTML).toBe('<div data-cleanup="true"><button>hide</button></div>')
    })

    it('cleanup for deps', async () => {
      let effectCount = 0
      let cleanupCount = 0

      const App = () => {
        const [count, setCount] = useState(0)
        const [count2, setCount2] = useState(0)
        useInsertionEffect(() => {
          effectCount++
          return () => {
            cleanupCount++
          }
        }, [count])
        return (
          <div>
            <p>{count}</p>
            <p>{count2}</p>
            <button onClick={() => setCount(count + 1)}>+</button>
            <button onClick={() => setCount2(count2 + 1)}>+</button>
          </div>
        )
      }
      const app = <App />
      render(app, root)
      expect(effectCount).toBe(1)
      expect(cleanupCount).toBe(0)
      root.querySelectorAll('button')[0].click() // count++
      await Promise.resolve()
      expect(effectCount).toBe(2)
      expect(cleanupCount).toBe(1)
      root.querySelectorAll('button')[1].click() // count2++
      await Promise.resolve()
      expect(effectCount).toBe(2)
      expect(cleanupCount).toBe(1)
    })
  })

  describe('useCallback', () => {
    it('deferent callbacks', async () => {
      const callbackSet = new Set<Function>()
      const Counter = () => {
        const [count, setCount] = useState(0)
        const increment = useCallback(() => {
          setCount(count + 1)
        }, [count])
        callbackSet.add(increment)
        return (
          <div>
            <p>{count}</p>
            <button onClick={increment}>+</button>
          </div>
        )
      }
      const app = <Counter />
      render(app, root)
      expect(root.innerHTML).toBe('<div><p>0</p><button>+</button></div>')
      const button = root.querySelector('button') as HTMLButtonElement
      button.click()
      await Promise.resolve()
      expect(root.innerHTML).toBe('<div><p>1</p><button>+</button></div>')
      expect(callbackSet.size).toBe(2)
    })

    it('same callback', async () => {
      const callbackSet = new Set<Function>()
      const Counter = () => {
        const [count, setCount] = useState(0)
        const increment = useCallback(() => {
          setCount(count + 1)
        }, [count])
        callbackSet.add(increment)

        const [count2, setCount2] = useState(0)
        return (
          <div>
            <p>{count}</p>
            <button onClick={increment}>+</button>
            <p>{count2}</p>
            <button onClick={() => setCount2(count2 + 1)}>+</button>
          </div>
        )
      }
      const app = <Counter />
      render(app, root)
      expect(root.innerHTML).toBe('<div><p>0</p><button>+</button><p>0</p><button>+</button></div>')
      const [, button] = root.querySelectorAll('button')
      button.click()
      await Promise.resolve()
      expect(root.innerHTML).toBe('<div><p>0</p><button>+</button><p>1</p><button>+</button></div>')
      expect(callbackSet.size).toBe(1)
    })

    it('deferent callbacks', async () => {
      const callbackSet = new Set<Function>()
      const Counter = () => {
        const [count, setCount] = useState(0)
        const double = useCallback((input: number): number => {
          return input * 2
        }, [])
        callbackSet.add(double)
        return (
          <div>
            <p>{double(count)}</p>
            <button onClick={() => setCount((c) => c + 1)}>+</button>
          </div>
        )
      }
      const app = <Counter />
      render(app, root)
      expect(root.innerHTML).toBe('<div><p>0</p><button>+</button></div>')
      const button = root.querySelector('button') as HTMLButtonElement
      button.click()
      await Promise.resolve()
      expect(root.innerHTML).toBe('<div><p>2</p><button>+</button></div>')
      expect(callbackSet.size).toBe(1)
    })
  })

  describe('useMemo', () => {
    it('simple', async () => {
      let factoryCalled = 0
      const Counter = () => {
        const [count, setCount] = useState(0)
        const [count2, setCount2] = useState(0)
        const memo = useMemo(() => {
          factoryCalled++
          return count + 1
        }, [count])
        return (
          <div>
            <p>{count}</p>
            <p>{count2}</p>
            <p>{memo}</p>
            <button onClick={() => setCount(count + 1)}>+</button>
            <button onClick={() => setCount2(count2 + 1)}>+</button>
          </div>
        )
      }
      const app = <Counter />
      render(app, root)
      expect(root.innerHTML).toBe(
        '<div><p>0</p><p>0</p><p>1</p><button>+</button><button>+</button></div>'
      )
      expect(factoryCalled).toBe(1)
      root.querySelectorAll('button')[0].click()
      await Promise.resolve()
      expect(root.innerHTML).toBe(
        '<div><p>1</p><p>0</p><p>2</p><button>+</button><button>+</button></div>'
      )
      expect(factoryCalled).toBe(2)
      root.querySelectorAll('button')[1].click()
      await Promise.resolve()
      expect(root.innerHTML).toBe(
        '<div><p>1</p><p>1</p><p>2</p><button>+</button><button>+</button></div>'
      )
      expect(factoryCalled).toBe(2)
    })
  })

  describe('isValidElement', () => {
    it('valid', () => {
      expect(isValidElement(<div />)).toBe(true)
    })

    it('invalid', () => {
      expect(isValidElement({})).toBe(false)
    })
  })

  describe('createElement', () => {
    it('simple', async () => {
      const App = () => {
        const [count, setCount] = useState(0)
        return (
          <div>{createElement('p', { onClick: () => setCount(count + 1) }, String(count))}</div>
        )
      }
      const app = <App />
      render(app, root)
      expect(root.innerHTML).toBe('<div><p>0</p></div>')
      root.querySelector('p')?.click()
      await Promise.resolve()
      expect(root.innerHTML).toBe('<div><p>1</p></div>')
    })

    it('title', async () => {
      const App = () => {
        return <div>{createElement('title', {}, 'Hello')}</div>
      }
      const app = <App />
      render(app, root)
      expect(document.head.innerHTML).toBe('<title>Hello</title>')
      expect(root.innerHTML).toBe('<div></div>')
    })
  })

  describe('dom-specific createElement', () => {
    it('simple', async () => {
      const App = () => {
        const [count, setCount] = useState(0)
        return <div>{createElementForDom('p', { onClick: () => setCount(count + 1) }, count)}</div>
      }
      const app = <App />
      render(app, root)
      expect(root.innerHTML).toBe('<div><p>0</p></div>')
      root.querySelector('p')?.click()
      await Promise.resolve()
      expect(root.innerHTML).toBe('<div><p>1</p></div>')
    })

    it('title', async () => {
      const App = () => {
        return <div>{createElementForDom('title', {}, 'Hello')}</div>
      }
      const app = <App />
      render(app, root)
      expect(document.head.innerHTML).toBe('<title>Hello</title>')
      expect(root.innerHTML).toBe('<div></div>')
    })
  })

  describe('cloneElement', () => {
    it('simple', async () => {
      const App = () => {
        const [count, setCount] = useState(0)
        return <div>{cloneElement(<p>{count}</p>, { onClick: () => setCount(count + 1) })}</div>
      }
      const app = <App />
      render(app, root)
      expect(root.innerHTML).toBe('<div><p>0</p></div>')
      root.querySelector('p')?.click()
      await Promise.resolve()
      expect(root.innerHTML).toBe('<div><p>1</p></div>')
    })
  })

  describe('dom-specific cloneElement', () => {
    it('simple', async () => {
      const App = () => {
        const [count, setCount] = useState(0)
        return (
          <div>{cloneElementForDom(<p>{count}</p>, { onClick: () => setCount(count + 1) })}</div>
        )
      }
      const app = <App />
      render(app, root)
      expect(root.innerHTML).toBe('<div><p>0</p></div>')
      root.querySelector('p')?.click()
      await Promise.resolve()
      expect(root.innerHTML).toBe('<div><p>1</p></div>')
    })
  })

  describe('flushSync', () => {
    it('simple', async () => {
      const SubApp = ({ id }: { id: string }) => {
        const [count, setCount] = useState(0)
        return (
          <div id={id}>
            <p>{count}</p>
            <button onClick={() => setCount(count + 1)}>+</button>
          </div>
        )
      }
      const App = () => {
        return (
          <div>
            <SubApp id='a' />
            <SubApp id='b' />
          </div>
        )
      }
      const app = <App />
      render(app, root)
      expect(root.innerHTML).toBe(
        '<div><div id="a"><p>0</p><button>+</button></div><div id="b"><p>0</p><button>+</button></div></div>'
      )
      root.querySelector<HTMLButtonElement>('#b button')?.click()
      flushSync(() => {
        root.querySelector<HTMLButtonElement>('#a button')?.click()
      })
      expect(root.innerHTML).toBe(
        '<div><div id="a"><p>1</p><button>+</button></div><div id="b"><p>0</p><button>+</button></div></div>'
      )
      await Promise.resolve()
      expect(root.innerHTML).toBe(
        '<div><div id="a"><p>1</p><button>+</button></div><div id="b"><p>1</p><button>+</button></div></div>'
      )
    })
  })

  describe('createPortal', () => {
    it('simple', async () => {
      const App = () => {
        const [count, setCount] = useState(0)
        return (
          <div>
            <button onClick={() => setCount(count + 1)}>+</button>
            {count <= 1 && createPortal(<p>{count}</p>, document.body)}
          </div>
        )
      }
      const app = <App />
      render(app, root)
      expect(root.innerHTML).toBe('<div><button>+</button></div>')
      expect(document.body.innerHTML).toBe(
        '<div id="root"><div><button>+</button></div></div><p>0</p>'
      )
      document.body.querySelector('button')?.click()
      await Promise.resolve()
      expect(root.innerHTML).toBe('<div><button>+</button></div>')
      expect(document.body.innerHTML).toBe(
        '<div id="root"><div><button>+</button></div></div><p>1</p>'
      )
      document.body.querySelector('button')?.click()
      await Promise.resolve()
      expect(document.body.innerHTML).toBe('<div id="root"><div><button>+</button></div></div>')
    })

    it('update', async () => {
      const App = () => {
        const [count, setCount] = useState(0)
        return (
          <div>
            {createPortal(<p>{count}</p>, document.body)}
            <button onClick={() => setCount(count + 1)}>+</button>
            <div>
              <p>{count}</p>
            </div>
          </div>
        )
      }
      const app = <App />
      render(app, root)
      expect(root.innerHTML).toBe('<div><button>+</button><div><p>0</p></div></div>')
      expect(document.body.innerHTML).toBe(
        '<div id="root"><div><button>+</button><div><p>0</p></div></div></div><p>0</p>'
      )

      const createElementSpy = vi.spyOn(dom.window.document, 'createElement')

      document.body.querySelector('button')?.click()
      await Promise.resolve()
      expect(root.innerHTML).toBe('<div><button>+</button><div><p>1</p></div></div>')
      expect(document.body.innerHTML).toBe(
        '<div id="root"><div><button>+</button><div><p>1</p></div></div></div><p>1</p>'
      )
      document.body.querySelector('button')?.click()
      await Promise.resolve()
      expect(document.body.innerHTML).toBe(
        '<div id="root"><div><button>+</button><div><p>2</p></div></div></div><p>2</p>'
      )

      expect(createElementSpy).not.toHaveBeenCalled()
    })
  })

  describe('SVG', () => {
    it('simple', () => {
      const App = () => {
        return (
          <svg>
            <circle cx='50' cy='50' r='40' stroke='black' stroke-width='3' fill='red' />
          </svg>
        )
      }
      render(<App />, root)
      expect(root.innerHTML).toBe(
        '<svg><circle cx="50" cy="50" r="40" stroke="black" stroke-width="3" fill="red"></circle></svg>'
      )
    })

    it('title element', () => {
      const App = () => {
        return (
          <>
            <title>Document Title</title>
            <svg>
              <title>SVG Title</title>
            </svg>
          </>
        )
      }
      render(<App />, root)
      expect(document.head.innerHTML).toBe('<title>Document Title</title>')
      expect(root.innerHTML).toBe('<svg><title>SVG Title</title></svg>')
      expect(document.querySelector('title')).toBeInstanceOf(dom.window.HTMLTitleElement)
      expect(document.querySelector('svg title')).toBeInstanceOf(dom.window.SVGTitleElement)
    })

    describe('attribute', () => {
      describe('camelCase', () => {
        test.each`
          key
          ${'attributeName'}
          ${'baseFrequency'}
          ${'calcMode'}
          ${'clipPathUnits'}
          ${'diffuseConstant'}
          ${'edgeMode'}
          ${'filterUnits'}
          ${'gradientTransform'}
          ${'gradientUnits'}
          ${'kernelMatrix'}
          ${'kernelUnitLength'}
          ${'keyPoints'}
          ${'keySplines'}
          ${'keyTimes'}
          ${'lengthAdjust'}
          ${'limitingConeAngle'}
          ${'markerHeight'}
          ${'markerUnits'}
          ${'markerWidth'}
          ${'maskContentUnits'}
          ${'maskUnits'}
          ${'numOctaves'}
          ${'pathLength'}
          ${'patternContentUnits'}
          ${'patternTransform'}
          ${'patternUnits'}
          ${'pointsAtX'}
          ${'pointsAtY'}
          ${'pointsAtZ'}
          ${'preserveAlpha'}
          ${'preserveAspectRatio'}
          ${'primitiveUnits'}
          ${'refX'}
          ${'refY'}
          ${'repeatCount'}
          ${'repeatDur'}
          ${'specularConstant'}
          ${'specularExponent'}
          ${'spreadMethod'}
          ${'startOffset'}
          ${'stdDeviation'}
          ${'stitchTiles'}
          ${'surfaceScale'}
          ${'crossorigin'}
          ${'systemLanguage'}
          ${'tableValues'}
          ${'targetX'}
          ${'targetY'}
          ${'textLength'}
          ${'viewBox'}
          ${'xChannelSelector'}
          ${'yChannelSelector'}
        `('$key', ({ key }) => {
          const App = () => {
            return (
              <svg>
                <g {...{ [key]: 'test' }} />
              </svg>
            )
          }
          render(<App />, root)
          expect(root.innerHTML).toBe(`<svg><g ${key}="test"></g></svg>`)
        })
      })

      describe('kebab-case', () => {
        test.each`
          key
          ${'alignmentBaseline'}
          ${'baselineShift'}
          ${'clipPath'}
          ${'clipRule'}
          ${'colorInterpolation'}
          ${'colorInterpolationFilters'}
          ${'dominantBaseline'}
          ${'fillOpacity'}
          ${'fillRule'}
          ${'floodColor'}
          ${'floodOpacity'}
          ${'fontFamily'}
          ${'fontSize'}
          ${'fontSizeAdjust'}
          ${'fontStretch'}
          ${'fontStyle'}
          ${'fontVariant'}
          ${'fontWeight'}
          ${'imageRendering'}
          ${'letterSpacing'}
          ${'lightingColor'}
          ${'markerEnd'}
          ${'markerMid'}
          ${'markerStart'}
          ${'overlinePosition'}
          ${'overlineThickness'}
          ${'paintOrder'}
          ${'pointerEvents'}
          ${'shapeRendering'}
          ${'stopColor'}
          ${'stopOpacity'}
          ${'strikethroughPosition'}
          ${'strikethroughThickness'}
          ${'strokeDasharray'}
          ${'strokeDashoffset'}
          ${'strokeLinecap'}
          ${'strokeLinejoin'}
          ${'strokeMiterlimit'}
          ${'strokeOpacity'}
          ${'strokeWidth'}
          ${'textAnchor'}
          ${'textDecoration'}
          ${'textRendering'}
          ${'transformOrigin'}
          ${'underlinePosition'}
          ${'underlineThickness'}
          ${'unicodeBidi'}
          ${'vectorEffect'}
          ${'wordSpacing'}
          ${'writingMode'}
        `('$key', ({ key }) => {
          const App = () => {
            return (
              <svg>
                <g {...{ [key]: 'test' }} />
              </svg>
            )
          }
          render(<App />, root)
          expect(root.innerHTML).toBe(
            `<svg><g ${key.replace(/([A-Z])/g, '-$1').toLowerCase()}="test"></g></svg>`
          )
        })
      })

      describe('data-*', () => {
        test.each`
          key
          ${'data-foo'}
          ${'data-foo-bar'}
          ${'data-fooBar'}
        `('$key', ({ key }) => {
          const App = () => {
            return (
              <svg>
                <g {...{ [key]: 'test' }} />
              </svg>
            )
          }
          render(<App />, root)
          expect(root.innerHTML).toBe(`<svg><g ${key}="test"></g></svg>`)
        })
      })
    })
  })

  describe('MathML', () => {
    it('simple', () => {
      const createElementSpy = vi.spyOn(dom.window.document, 'createElement')
      const createElementNSSpy = vi.spyOn(dom.window.document, 'createElementNS')

      const App = () => {
        return (
          <math>
            <mrow>
              <mn>1</mn>
            </mrow>
          </math>
        )
      }
      render(<App />, root)
      expect(root.innerHTML).toBe('<math><mrow><mn>1</mn></mrow></math>')

      expect(createElementSpy).not.toHaveBeenCalled()
      expect(createElementNSSpy).toHaveBeenCalledWith('http://www.w3.org/1998/Math/MathML', 'math')
      expect(createElementNSSpy).toHaveBeenCalledWith('http://www.w3.org/1998/Math/MathML', 'mrow')
    })
  })
})

describe('jsx', () => {
  it('exported as an alias of createElement', () => {
    expect(jsx).toBeDefined()
    expect(jsx('div', {}, 'Hello')).toBeInstanceOf(Object)
  })
})

describe('version', () => {
  it('should be defined with semantic versioning format', () => {
    expect(version).toMatch(/^\d+\.\d+\.\d+-hono-jsx$/)
  })
})

describe('default export', () => {
  ;[
    'version',
    'memo',
    'Fragment',
    'isValidElement',
    'createElement',
    'cloneElement',
    'ErrorBoundary',
    'createContext',
    'useContext',
    'useState',
    'useEffect',
    'useRef',
    'useCallback',
    'useReducer',
    'useDebugValue',
    'createRef',
    'forwardRef',
    'useImperativeHandle',
    'useSyncExternalStore',
    'use',
    'startTransition',
    'useTransition',
    'useDeferredValue',
    'startViewTransition',
    'useViewTransition',
    'useActionState',
    'useFormStatus',
    'useOptimistic',
    'useMemo',
    'useLayoutEffect',
    'Suspense',
    'Fragment',
    'flushSync',
    'createPortal',
    'StrictMode',
  ].forEach((key) => {
    it(key, () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((DefaultExport as any)[key]).toBeDefined()
    })
  })
})
