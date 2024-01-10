/** @jsxRuntime automatic @jsxImportSource .. */
import { JSDOM } from 'jsdom'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { jsx } from '..'
import { useState, useEffect, useCallback, useRef } from '../hooks'
import type { RefObject } from '../hooks'
import { render } from '.'

describe('DOM', () => {
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

  it('simple App', async () => {
    const App = <h1>Hello</h1>
    render(App, root)
    expect(root.innerHTML).toBe('<h1>Hello</h1>')
  })

  it('replace', async () => {
    dom.window.document.body.innerHTML = '<div id="root">Existing content</div>'
    root = document.getElementById('root') as HTMLElement
    const App = <h1>Hello</h1>
    render(App, root)
    expect(root.innerHTML).toBe('<h1>Hello</h1>')
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
    expect(root.innerHTML).toBe('<div><p>Count: 1</p><button>+</button></div>')
  })

  it('multiple useState()', async () => {
    const Counter = () => {
      const [countA, setCountA] = useState(0)
      const [countB, setCountB] = useState(0)
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
    const [buttonA, buttonB] = root.querySelectorAll('button')
    for (let i = 0; i < 3; i++) {
      buttonA.click()
    }
    for (let i = 0; i < 4; i++) {
      buttonB.click()
    }
    expect(root.innerHTML).toBe(
      '<div><p>A: 3</p><button>+</button><p>B: 4</p><button>+</button></div>'
    )
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
    }
    for (let i = 0; i < 6; i++) {
      childButton.click()
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
    expect(root.innerHTML).toBe('<div><div>Odd</div><button>+</button></div>')
    button.click()
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
    expect(root.innerHTML).toBe(
      '<div><div>a</div><div>b</div><div>c</div><div>d</div><button>add</button><button>remove</button><button>swap</button></div>'
    )
    const [, , swapButton] = root.querySelectorAll('button')
    swapButton.click()
    expect(root.innerHTML).toBe(
      '<div><div>a</div><div>c</div><div>b</div><div>d</div><button>add</button><button>remove</button><button>swap</button></div>'
    )
    const [, removeButton] = root.querySelectorAll('button')
    removeButton.click()
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
    expect(root.innerHTML).toBe(
      '<form><div><label>Name</label><input></div><div><label>Email</label><input></div><span>{"name":"John"}</span></form>'
    )
    const [, emailInput] = root.querySelectorAll('input')
    emailInput.value = 'john@example.com'
    emailInput.dispatchEvent(new dom.window.Event('input'))
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
      const [button] = root.querySelectorAll('button')
      button.click()
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
      expect(effectCount).toBe(1)
      expect(cleanupCount).toBe(0)
      root.querySelectorAll('button')[0].click() // count++
      expect(effectCount).toBe(2)
      expect(cleanupCount).toBe(1)
      root.querySelectorAll('button')[1].click() // count2++
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
      expect(root.innerHTML).toBe('<div><p>0</p><button>+</button><p>1</p><button>+</button></div>')
      expect(callbackSet.size).toBe(1)
    })
  })
})
