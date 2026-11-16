/** @jsxImportSource ../../ */
import { JSDOM } from 'jsdom'
import { useActionState, useFormStatus, useOptimistic } from '.'
import { render, useCallback, useState } from '..'

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
    global.FormData = dom.window.FormData
    root = document.getElementById('root') as HTMLElement
  })

  describe('useActionState', () => {
    it('should return initial state', () => {
      const [state] = useActionState(() => {}, 'initial')
      expect(state).toBe('initial')
    })

    it('should return updated state', async () => {
      const action = vi.fn().mockReturnValue('updated')

      const App = () => {
        const [state, formAction] = useActionState(action, 'initial')
        return (
          <>
            <div>{state}</div>
            <form action={formAction}>
              <input type='text' name='name' value='updated' />
              <button>Submit</button>
            </form>
          </>
        )
      }

      render(<App />, root)
      expect(root.innerHTML).toBe(
        '<div>initial</div><form><input type="text" name="name" value="updated"><button>Submit</button></form>'
      )
      root.querySelector('button')?.click()
      await Promise.resolve()
      await Promise.resolve()
      expect(root.innerHTML).toBe(
        '<div>updated</div><form><input type="text" name="name" value="updated"><button>Submit</button></form>'
      )

      expect(action).toHaveBeenCalledOnce()
      const [initialState, formData] = action.mock.calls[0]
      expect(initialState).toBe('initial')
      expect(formData).toBeInstanceOf(FormData)
      expect(formData.get('name')).toBe('updated')
    })

    it('should return isPending while the action is running', async () => {
      let resolve: (value: string) => void = () => {}
      const action = vi.fn(() => new Promise<string>((r) => (resolve = r)))

      const App = () => {
        const [state, formAction, isPending] = useActionState(action, 'initial')
        return (
          <>
            <div>
              {state} {isPending ? 'pending' : 'idle'}
            </div>
            <form action={formAction}>
              <button>Submit</button>
            </form>
          </>
        )
      }

      render(<App />, root)
      expect(root.querySelector('div')?.textContent).toBe('initial idle')
      root.querySelector('button')?.click()
      await new Promise((r) => setTimeout(r))
      expect(root.querySelector('div')?.textContent).toBe('initial pending')
      resolve('updated')
      await new Promise((r) => setTimeout(r))
      expect(root.querySelector('div')?.textContent).toBe('updated idle')
    })

    it('should return the same dispatch function across renders', async () => {
      const dispatches: Function[] = []
      let setCount: (count: number) => void = () => {}
      const App = () => {
        const [count, _setCount] = useState(0)
        setCount = _setCount
        const [, dispatch] = useActionState(() => {}, null)
        dispatches.push(dispatch)
        return <div>{count}</div>
      }

      render(<App />, root)
      setCount(1)
      await new Promise((r) => setTimeout(r))
      expect(root.innerHTML).toBe('<div>1</div>')
      expect(dispatches).toHaveLength(2)
      expect(dispatches[0]).toBe(dispatches[1])
    })

    it('should run queued actions in order with the previous state', async () => {
      const resolvers: Array<() => void> = []
      const action = vi.fn(
        (count: number) => new Promise<number>((r) => resolvers.push(() => r(count + 1)))
      )
      let dispatch: Function = () => {}
      const App = () => {
        const [count, _dispatch] = useActionState(action, 0)
        dispatch = _dispatch
        return <div>{count}</div>
      }

      render(<App />, root)
      dispatch()
      dispatch()
      await new Promise((r) => setTimeout(r))
      expect(action).toHaveBeenCalledTimes(1)
      resolvers[0]()
      await new Promise((r) => setTimeout(r))
      expect(action).toHaveBeenCalledTimes(2)
      expect(action.mock.calls[1][0]).toBe(1)
      resolvers[1]()
      await new Promise((r) => setTimeout(r))
      expect(root.innerHTML).toBe('<div>2</div>')
    })
  })

  describe('useFormStatus', () => {
    it('should return initial state', () => {
      const status = useFormStatus()
      expect(status).toEqual({
        pending: false,
        data: null,
        method: null,
        action: null,
      })
    })

    it('should return updated state', async () => {
      let formResolve: () => void = () => {}
      const formPromise = new Promise<void>((r) => (formResolve = r))
      let status: ReturnType<typeof useFormStatus> | undefined
      const Status = () => {
        status = useFormStatus()
        return null
      }
      const App = () => {
        const [, setCount] = useState(0)
        const action = useCallback(() => {
          setCount((count) => count + 1)
          return formPromise
        }, [])
        return (
          <>
            <form action={action}>
              <Status />
              <input type='text' name='name' value='updated' />
              <button>Submit</button>
            </form>
          </>
        )
      }

      render(<App />, root)
      expect(root.innerHTML).toBe(
        '<form><input type="text" name="name" value="updated"><button>Submit</button></form>'
      )
      root.querySelector('button')?.click()
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
      expect(status).toEqual({
        pending: true,
        data: expect.any(FormData),
        method: 'post',
        action: expect.any(Function),
      })
      formResolve?.()
      await Promise.resolve()
      await Promise.resolve()
      expect(status).toEqual({
        pending: false,
        data: null,
        method: null,
        action: null,
      })
    })
  })

  describe('useOptimistic', () => {
    it('should return updated state', async () => {
      let formResolve: () => void = () => {}
      const formPromise = new Promise<void>((r) => (formResolve = r))
      const App = () => {
        const [count, setCount] = useState(0)
        const [optimisticCount, setOptimisticCount] = useOptimistic(count, (_c, n: number) => n)
        const action = useCallback(async () => {
          setOptimisticCount(count + 1)
          await formPromise
          setCount((count) => count + 2)
        }, [])

        return (
          <>
            <form action={action}>
              <div>{optimisticCount}</div>
              <input type='text' name='name' value='updated' />
              <button>Submit</button>
            </form>
          </>
        )
      }

      render(<App />, root)
      expect(root.innerHTML).toBe(
        '<form><div>0</div><input type="text" name="name" value="updated"><button>Submit</button></form>'
      )
      root.querySelector('button')?.click()
      await Promise.resolve()
      expect(root.innerHTML).toBe(
        '<form><div>1</div><input type="text" name="name" value="updated"><button>Submit</button></form>'
      )
      formResolve?.()
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
      expect(root.innerHTML).toBe(
        '<form><div>2</div><input type="text" name="name" value="updated"><button>Submit</button></form>'
      )
    })
  })
})
