/** @jsxImportSource ../ */
import { JSDOM } from 'jsdom'
// run tests by old style jsx default
// hono/jsx/jsx-runtime and hono/jsx/dom/jsx-runtime are tested in their respective settings
import { ErrorBoundary, Suspense, render } from '../dom'
import {
  createRef,
  forwardRef,
  startTransition,
  startViewTransition,
  use,
  useDebugValue,
  useDeferredValue,
  useId,
  useImperativeHandle,
  useReducer,
  useState,
  useSyncExternalStore,
  useTransition,
  useViewTransition,
} from '.'

describe('Hooks', () => {
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

  describe('useReducer()', () => {
    it('simple', async () => {
      const reducer = (state: number, action: number) => state + action
      const functions: Function[] = []
      const App = () => {
        const [state, dispatch] = useReducer(reducer, 0)
        functions.push(dispatch)
        return (
          <div>
            <button onClick={() => dispatch(1)}>{state}</button>
          </div>
        )
      }
      render(<App />, root)
      expect(root.innerHTML).toBe('<div><button>0</button></div>')
      root.querySelector('button')?.click()
      await Promise.resolve()
      expect(root.innerHTML).toBe('<div><button>1</button></div>')
      expect(functions[0]).toBe(functions[1])
    })
  })

  describe('startTransition()', () => {
    it('no error', async () => {
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
      await Promise.resolve()
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
      await Promise.resolve()
      expect(root.innerHTML).toBe('<div><button>Pending...</button></div>')
      expect(called).toBe(2)
      await new Promise((r) => setTimeout(r))
      await new Promise((r) => setTimeout(r))
      await new Promise((r) => setTimeout(r))
      expect(root.innerHTML).toBe('<div><button>1</button></div>')
      expect(called).toBe(3)
    })

    it('pending', async () => {
      let resolve: (() => void) | undefined
      const promise = new Promise<void>((r) => (resolve = r))
      let called = 0
      const App = () => {
        const [isPending, startTransition] = useTransition()
        called++

        return (
          <div>
            <button
              onClick={() => {
                startTransition(async () => await promise)
              }}
            >
              {isPending ? 'Pending...' : 'Click me'}
            </button>
          </div>
        )
      }
      render(<App />, root)
      expect(root.innerHTML).toBe('<div><button>Click me</button></div>')
      root.querySelector('button')?.click()
      await Promise.resolve()
      expect(root.innerHTML).toBe('<div><button>Pending...</button></div>')
      expect(called).toBe(2)
      resolve!()
      await new Promise((r) => setTimeout(r))
      await new Promise((r) => setTimeout(r))
      await new Promise((r) => setTimeout(r))
      expect(root.innerHTML).toBe('<div><button>Click me</button></div>')
      expect(called).toBe(3)
    })

    it('pending - error', async () => {
      let reject: (() => void) | undefined
      const promise = new Promise<void>((_, r) => (reject = r))
      let called = 0
      const Component = () => {
        const [isPending, startTransition] = useTransition()
        called++

        return (
          <div>
            <button
              onClick={() => {
                startTransition(async () => await promise)
              }}
            >
              {isPending ? 'Pending...' : 'Click me'}
            </button>
          </div>
        )
      }
      const App = () => (
        <ErrorBoundary fallback={<div>Error</div>}>
          <Component />
        </ErrorBoundary>
      )
      render(<App />, root)
      expect(root.innerHTML).toBe('<div><button>Click me</button></div>')
      root.querySelector('button')?.click()
      await Promise.resolve()
      expect(root.innerHTML).toBe('<div><button>Pending...</button></div>')
      expect(called).toBe(2)
      reject!()
      await new Promise((r) => setTimeout(r))
      await new Promise((r) => setTimeout(r))
      await new Promise((r) => setTimeout(r))
      expect(root.innerHTML).toBe('<div>Error</div>')
      expect(called).toBe(2)
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
      await Promise.resolve()
      expect(root.innerHTML).toBe('<div><button>Pending...</button></div>')
      expect(called).toBe(2)
      await new Promise((r) => setTimeout(r))
      await new Promise((r) => setTimeout(r))
      await new Promise((r) => setTimeout(r))
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
      expect(called).toBe(1)
      root.querySelector('button')?.click()
      await Promise.resolve()
      expect(root.innerHTML).toBe('<div><button>Pending...</button></div>')
      expect(called).toBe(2)
      await new Promise((r) => setTimeout(r))
      await new Promise((r) => setTimeout(r))
      await new Promise((r) => setTimeout(r))
      expect(root.innerHTML).toBe('<div><button>3</button></div>')
      expect(called).toBe(3) // + isPending=true + isPending=false
    })
  })

  describe('useDeferredValue()', () => {
    it('deferred', async () => {
      const promiseMap = {} as Record<number, Promise<number>>
      const getPromise = (count: number) => {
        return (promiseMap[count] ||= new Promise((r) => setTimeout(() => r(count + 1))))
      }
      const ShowCount = ({ count }: { count: number }) => {
        if (count === 0) {
          return <div>0</div>
        }

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
      await Promise.resolve()
      expect(root.innerHTML).toBe('<div><button>+1</button></div><div>0</div>')
      await new Promise((r) => setTimeout(r))
      expect(root.innerHTML).toBe('<div><button>+1</button></div><div>0</div>')
      await new Promise((r) => setTimeout(r))
      expect(root.innerHTML).toBe('<div><button>+1</button></div><div>0</div>')
      await new Promise((r) => setTimeout(r))
      expect(root.innerHTML).toBe('<div><button>+1</button></div><div>0</div>')
      await new Promise((r) => setTimeout(r))
      expect(root.innerHTML).toBe('<div><button>+1</button></div><div>2</div>')
    })

    it('initial value', async () => {
      const promiseMap = {} as Record<number, Promise<number>>
      const getPromise = (count: number) => {
        return (promiseMap[count] ||= new Promise((r) => setTimeout(() => r(count + 1))))
      }
      const ShowCount = ({ count }: { count: number }) => {
        if (count === 0 || count === 99) {
          return <div>{count}</div>
        }

        const c = use(getPromise(count))
        return <div>{c}</div>
      }

      const App = () => {
        const [count, setCount] = useState(1)
        const c = useDeferredValue(count, 99)
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
      expect(root.innerHTML).toBe('<div><button>+1</button></div><div>99</div>')
      await new Promise((r) => setTimeout(r))
      await new Promise((r) => setTimeout(r))
      await new Promise((r) => setTimeout(r))
      await new Promise((r) => setTimeout(r))
      expect(root.innerHTML).toBe('<div><button>+1</button></div><div>2</div>')
      root.querySelector('button')?.click()
      await new Promise((r) => setTimeout(r))
      await new Promise((r) => setTimeout(r))
      await new Promise((r) => setTimeout(r))
      await new Promise((r) => setTimeout(r))
      expect(root.innerHTML).toBe('<div><button>+1</button></div><div>3</div>')
    })
  })

  describe('startViewTransition()', () => {
    afterEach(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (dom.window.document as any).startViewTransition
    })

    it('supported browser', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(dom.window.document as any).startViewTransition = vi.fn((cb: Function) => {
        Promise.resolve().then(() => cb())
        return { finished: Promise.resolve() }
      })

      const App = () => {
        const [count, setCount] = useState(0)
        return (
          <Suspense fallback={<div>Loading...</div>}>
            <div>
              <button
                onClick={() => {
                  startViewTransition(() => {
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
      await Promise.resolve()
      expect(root.innerHTML).toBe('<div><button>0</button></div>')
      await Promise.resolve() // updated in microtask
      expect(root.innerHTML).toBe('<div><button>1</button></div>')
    })

    it('unsupported browser', async () => {
      const App = () => {
        const [count, setCount] = useState(0)
        return (
          <Suspense fallback={<div>Loading...</div>}>
            <div>
              <button
                onClick={() => {
                  startViewTransition(() => {
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
      await Promise.resolve()
      expect(root.innerHTML).toBe('<div><button>1</button></div>')
    })

    it('with useTransition()', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(dom.window.document as any).startViewTransition = vi.fn((cb: Function) => {
        Promise.resolve().then(() => cb())
        return { finished: Promise.resolve() }
      })

      let called = 0
      const App = () => {
        const [count, setCount] = useState(0)
        const [isPending, startTransition] = useTransition()
        called++

        return (
          <div>
            <button
              onClick={() => {
                startViewTransition(() => {
                  startTransition(() => {
                    setCount((c) => c + 1)
                  })
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
      await new Promise((r) => setTimeout(r))
      expect(root.innerHTML).toBe('<div><button>Pending...</button></div>')
      expect(called).toBe(2)
      await new Promise((r) => setTimeout(r))
      await new Promise((r) => setTimeout(r))
      expect(root.innerHTML).toBe('<div><button>1</button></div>')
      expect(called).toBe(3)
    })
  })

  describe('useViewTransition()', () => {
    afterEach(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (dom.window.document as any).startViewTransition
    })

    it('supported browser', async () => {
      let resolved: (() => void) | undefined
      const promise = new Promise<void>((r) => (resolved = r))
      let called = 0
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(global.document as any).startViewTransition = vi.fn((cb: Function) => {
        Promise.resolve().then(() => cb())
        return { finished: promise }
      })

      const App = () => {
        const [count, setCount] = useState(0)
        const [isUpdating, startViewTransition] = useViewTransition()
        called++

        return (
          <div>
            <button
              onClick={() => {
                startViewTransition(() => {
                  setCount((c) => c + 1)
                })
              }}
            >
              {isUpdating ? 'Pending...' : count}
            </button>
          </div>
        )
      }
      render(<App />, root)
      expect(root.innerHTML).toBe('<div><button>0</button></div>')
      root.querySelector('button')?.click()
      await new Promise((r) => setTimeout(r))
      expect(root.innerHTML).toBe('<div><button>Pending...</button></div>')
      expect(called).toBe(2)
      resolved?.()
      await new Promise((r) => setTimeout(r))
      expect(root.innerHTML).toBe('<div><button>1</button></div>')
      expect(called).toBe(3)
    })
  })

  describe('useId()', () => {
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

    it('simple', () => {
      const App = () => {
        const id = useId()
        return <div id={id} />
      }
      render(<App />, root)
      expect(root.innerHTML).toBe('<div id=":r0:"></div>')
    })

    it('memoized', async () => {
      let setCount: (c: number) => void = () => {}
      const App = () => {
        const id = useId()
        const [count, _setCount] = useState(0)
        setCount = _setCount
        return <div id={id}>{count}</div>
      }
      render(<App />, root)
      expect(root.innerHTML).toBe('<div id=":r1:">0</div>')
      setCount(1)
      await Promise.resolve()
      expect(root.innerHTML).toBe('<div id=":r1:">1</div>')
    })
  })

  describe('useDebugValue()', () => {
    it('simple', () => {
      const spy = vi.fn()
      const App = () => {
        useDebugValue('hello', spy)
        return <div />
      }
      render(<App />, root)
      expect(root.innerHTML).toBe('<div></div>')
      expect(spy).not.toBeCalled()
    })
  })

  describe('createRef()', () => {
    it('simple', () => {
      const ref: { current: HTMLElement | null } = createRef<HTMLDivElement>()
      const App = () => {
        return <div ref={ref} />
      }
      render(<App />, root)
      expect(root.innerHTML).toBe('<div></div>')
      expect(ref.current).toBeInstanceOf(HTMLElement)
    })
  })

  describe('forwardRef()', () => {
    it('simple', () => {
      const ref: { current: HTMLElement | null } = createRef<HTMLDivElement>()
      const App = forwardRef((props, ref) => {
        return <div {...props} ref={ref} />
      })
      render(<App ref={ref} />, root)
      expect(root.innerHTML).toBe('<div></div>')
      expect(ref.current).toBeInstanceOf(HTMLElement)
    })

    it('can run without ref', () => {
      const App = forwardRef((props) => {
        return <div {...props} />
      })
      render(<App />, root)
      expect(root.innerHTML).toBe('<div></div>')
    })
  })

  describe('useImperativeHandle()', () => {
    it('simple', async () => {
      const ref: { current: { focus: () => void } | null } = createRef()
      const SubApp = () => {
        useImperativeHandle(
          ref,
          () => ({
            focus: () => {
              console.log('focus')
            },
          }),
          []
        )
        return <div />
      }
      const App = () => {
        const [show, setShow] = useState(true)
        return (
          <>
            {show && <SubApp />}
            <button onClick={() => setShow((s) => !s)}>toggle</button>
          </>
        )
      }
      render(<App />, root)
      expect(ref.current).toBe(null)
      await new Promise((r) => setTimeout(r))
      expect(ref.current).toEqual({ focus: expect.any(Function) })
      root.querySelector('button')?.click()
      await new Promise((r) => setTimeout(r))
      expect(ref.current).toBe(null)
    })
  })

  describe('useSyncExternalStore()', () => {
    it('simple', async () => {
      let count = 0
      const unsubscribe = vi.fn()
      const subscribe = vi.fn(() => unsubscribe)
      const getSnapshot = vi.fn(() => count++)
      const SubApp = () => {
        const count = useSyncExternalStore(subscribe, getSnapshot)
        return <div>{count}</div>
      }
      const App = () => {
        const [show, setShow] = useState(true)
        return (
          <>
            {show && <SubApp />}
            <button onClick={() => setShow((s) => !s)}>toggle</button>
          </>
        )
      }
      render(<App />, root)
      expect(root.innerHTML).toBe('<div>0</div><button>toggle</button>')
      await new Promise((r) => setTimeout(r))
      root.querySelector('button')?.click()
      await new Promise((r) => setTimeout(r))
      expect(root.innerHTML).toBe('<button>toggle</button>')
      expect(unsubscribe).toBeCalled()
      root.querySelector('button')?.click()
      await new Promise((r) => setTimeout(r))
      expect(root.innerHTML).toBe('<div>1</div><button>toggle</button>')
    })

    it('with getServerSnapshot', async () => {
      let count = 0
      const unsubscribe = vi.fn()
      const subscribe = vi.fn(() => unsubscribe)
      const getSnapshot = vi.fn(() => count++)
      const getServerSnapshot = vi.fn(() => 100)
      const SubApp = () => {
        const count = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
        return <div>{count}</div>
      }
      const App = () => {
        const [show, setShow] = useState(true)
        return (
          <>
            {show && <SubApp />}
            <button onClick={() => setShow((s) => !s)}>toggle</button>
          </>
        )
      }
      render(<App />, root)
      expect(root.innerHTML).toBe('<div>100</div><button>toggle</button>')
      await new Promise((r) => setTimeout(r))
      expect(root.innerHTML).toBe('<div>0</div><button>toggle</button>')
      root.querySelector('button')?.click()
      await new Promise((r) => setTimeout(r))
      expect(root.innerHTML).toBe('<button>toggle</button>')
      expect(unsubscribe).toBeCalled()
      root.querySelector('button')?.click()
      await new Promise((r) => setTimeout(r))
      expect(root.innerHTML).toBe('<div>1</div><button>toggle</button>')
    })
  })
})
