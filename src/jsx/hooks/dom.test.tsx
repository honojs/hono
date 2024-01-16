import { JSDOM } from 'jsdom'
// run tests by old style jsx default
// hono/jsx/jsx-runtime and hono/jsx/dom/jsx-runtime are tested in their respective settings
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { jsx, Fragment } from '..'
import { Suspense } from '../dom'
import { render } from '../dom'
import { useState, use, startTransition, useTransition, useDeferredValue } from '.'

describe('startTransition()', () => {
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

  it('no error', () => {
    const App = () => {
      const [count, setCount] = useState(0)
      return (
        <Suspense fallback={<div>Loading...</div>}>
          <div>
            <button
              onClick={() => {
                startTransition(() => {
                  setCount((c) => c + 1)
                })
              }}
            >
              {count}
            </button>
          </div>
        </Suspense>
      )
    }
    render(<App />, root)
    expect(root.innerHTML).toBe('<div><button>0</button></div>')
    root.querySelector('button')?.click()
    expect(root.innerHTML).toBe('<div><button>1</button></div>')
  })

  it('got an error', async () => {
    let resolve: () => void
    const promise = new Promise<void>((r) => (resolve = r))

    const Counter = ({ count }: { count: number }) => {
      use(promise)
      return <div>{count}</div>
    }

    const App = () => {
      const [count, setCount] = useState(0)
      return (
        <Suspense fallback={<div>Loading...</div>}>
          <div>
            <button
              onClick={() => {
                startTransition(() => {
                  setCount((c) => c + 1)
                })
              }}
            >
              {count ? <Counter count={count} /> : count}
            </button>
          </div>
        </Suspense>
      )
    }
    render(<App />, root)
    expect(root.innerHTML).toBe('<div><button>0</button></div>')
    root.querySelector('button')?.click()
    expect(root.innerHTML).toBe('<div><button>0</button></div>')
    resolve!()
    await new Promise((r) => setTimeout(r))
    expect(root.innerHTML).toBe('<div><button><div>1</div></button></div>')
  })
})

describe('useTransition()', () => {
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

  it('pending', async () => {
    let called = 0
    const App = () => {
      const [count, setCount] = useState(0)
      const [isPending, startTransition] = useTransition()
      called++

      return (
        <div>
          <button
            onClick={() => {
              startTransition(() => {
                setCount((c) => c + 1)
              })
            }}
          >
            {isPending ? 'Pending...' : count}
          </button>
        </div>
      )
    }
    render(<App />, root)
    expect(root.innerHTML).toBe('<div><button>0</button></div>')
    root.querySelector('button')?.click()
    expect(root.innerHTML).toBe('<div><button>Pending...</button></div>')
    expect(called).toBe(2)
    while (root.innerHTML === '<div><button>Pending...</button></div>') {
      await new Promise((r) => setTimeout(r))
    }
    expect(root.innerHTML).toBe('<div><button>1</button></div>')
    expect(called).toBe(3)
  })

  it('multiple setState at once', async () => {
    let called = 0
    const App = () => {
      const [count1, setCount1] = useState(0)
      const [count2, setCount2] = useState(0)
      const [isPending, startTransition] = useTransition()
      called++

      return (
        <div>
          <button
            onClick={() => {
              startTransition(() => {
                setCount1((c) => c + 1)
                setCount2((c) => c + 2)
              })
            }}
          >
            {isPending ? 'Pending...' : count1 + count2}
          </button>
        </div>
      )
    }
    render(<App />, root)
    expect(root.innerHTML).toBe('<div><button>0</button></div>')
    root.querySelector('button')?.click()
    expect(root.innerHTML).toBe('<div><button>Pending...</button></div>')
    expect(called).toBe(2)
    while (root.innerHTML === '<div><button>Pending...</button></div>') {
      await new Promise((r) => setTimeout(r))
    }
    expect(root.innerHTML).toBe('<div><button>3</button></div>')
    expect(called).toBe(3)
  })

  it('multiple startTransaction at once', async () => {
    let called = 0
    const App = () => {
      const [count1, setCount1] = useState(0)
      const [count2, setCount2] = useState(0)
      const [isPending, startTransition] = useTransition()
      called++

      return (
        <div>
          <button
            onClick={() => {
              startTransition(() => {
                setCount1((c) => c + 1)
              })
              startTransition(() => {
                setCount2((c) => c + 2)
              })
            }}
          >
            {isPending ? 'Pending...' : count1 + count2}
          </button>
        </div>
      )
    }
    render(<App />, root)
    expect(root.innerHTML).toBe('<div><button>0</button></div>')
    root.querySelector('button')?.click()
    expect(root.innerHTML).toBe('<div><button>Pending...</button></div>')
    expect(called).toBe(3)
    while (root.innerHTML === '<div><button>Pending...</button></div>') {
      await new Promise((r) => setTimeout(r))
    }
    expect(root.innerHTML).toBe('<div><button>3</button></div>')
    expect(called).toBe(5)
  })
})

describe('useDeferredValue()', () => {
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

  it('deferred', async () => {
    const promiseMap = {} as Record<number, Promise<number>>
    const getPromise = (count: number) => {
      return (promiseMap[count] ||= new Promise((r) => setTimeout(() => r(count + 1))))
    }
    const ShowCount = ({ count }: { count: number }) => {
      if (count === 0) return <div>0</div>

      const c = use(getPromise(count))
      return <div>{c}</div>
    }

    const App = () => {
      const [count, setCount] = useState(0)
      const c = useDeferredValue(count)
      return (
        <>
          <div>
            <button onClick={() => setCount((c) => c + 1)}>+1</button>
          </div>
          <Suspense fallback={<div>Loading...</div>}>
            <ShowCount count={c} />
          </Suspense>
        </>
      )
    }
    render(<App />, root)
    expect(root.innerHTML).toBe('<div><button>+1</button></div><div>0</div>')
    root.querySelector('button')?.click()
    expect(root.innerHTML).toBe('<div><button>+1</button></div><div>0</div>')
    await new Promise((r) => setTimeout(r))
    expect(root.innerHTML).toBe('<div><button>+1</button></div><div>2</div>')
  })
})
