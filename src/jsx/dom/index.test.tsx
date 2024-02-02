import { JSDOM } from 'jsdom'
// run tests by old style jsx default
// hono/jsx/jsx-runtime and hono/jsx/dom/jsx-runtime are tested in their respective settings
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { jsx, Fragment } from '..'
import type { RefObject } from '../hooks'
import { useState, useEffect, useCallback, useRef } from '../hooks'
import type { NodeObject } from './render'
import { render } from '.'

const getContainer = (element: JSX.Element): DocumentFragment | HTMLElement | undefined => {
  return (element as unknown as NodeObject).c
}

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

    it('event', () => {
      const App = () => <button onClick={() => {}} />
      render(<App />, root)
      expect(root.innerHTML).toBe('<button></button>')
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
      const container = getContainer(app) as HTMLElement
      expect(root.innerHTML).toBe('<div>0</div>')

      const insertBeforeSpy = vi.spyOn(container, 'insertBefore')
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
    for (let i = 0; i < 5; i++) {
      button.click()
      await Promise.resolve()
    }
    for (let i = 0; i < 6; i++) {
      childButton.click()
      await Promise.resolve()
    }
    expect(root.innerHTML).toBe(
      '<div><p>Count: 5</p><button>+</button><div><p>Child Count: 6</p><button>+</button></div></div>'
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

  it('setState for unnamed function', async () => {
    const Input = ({ label, onInput }: { label: string; onInput: (value: string) => void }) => {
      return (
        <div>
          <label>{label}</label>
          <input
            onInput={(e: MouseEvent) => onInput((e.target as HTMLInputElement)?.value || '')}
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

  it('useRef', async () => {
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
  })
})
