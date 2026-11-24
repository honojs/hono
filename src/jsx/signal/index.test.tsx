/** @jsxImportSource ../ */
import { setFlagsFromString } from 'node:v8'
import { runInNewContext } from 'node:vm'
import { JSDOM } from 'jsdom'
import { batch, computed, effect, signal, untracked } from '.'
import type { ReadonlySignal } from '.'
import { SIGNAL } from '../constants'
import { ErrorBoundary, memo, render, useState } from '../dom'

// count how many times the signal is subscribed and unsubscribed
const spySubscription = <T,>(target: ReadonlySignal<T>) => {
  const counts = { subscribed: 0, unsubscribed: 0 }
  const subscribe = target.subscribe
  target.subscribe = (fn) => {
    counts.subscribed++
    const unsubscribe = subscribe(fn)
    return () => {
      counts.unsubscribed++
      unsubscribe()
    }
  }
  return counts
}

setFlagsFromString('--expose-gc')
const gc: () => void = runInNewContext('gc')
// true if the object held by the WeakRef is collected
const isCollected = async (ref: WeakRef<object>): Promise<boolean> => {
  for (let i = 0; i < 10 && ref.deref(); i++) {
    await new Promise((resolve) => setTimeout(resolve))
    gc()
  }
  return !ref.deref()
}

describe('signal', () => {
  it('should read and write the value', () => {
    const count = signal(0)
    expect(count.value).toBe(0)
    count.value = 1
    expect(count.value).toBe(1)
    expect(count.peek()).toBe(1)
  })

  it('should be marked with the shared symbol', () => {
    expect(signal(0)[SIGNAL]).toBe(true)
    expect(computed(() => 0)[SIGNAL]).toBe(true)
    expect(SIGNAL).toBe(Symbol.for('hono.signal'))
  })

  it('should not track the value read by peek()', async () => {
    const count = signal(0)
    const fn = vi.fn(() => {
      count.peek()
    })
    effect(fn)
    count.value++
    await Promise.resolve()
    expect(fn).toHaveBeenCalledTimes(1)
  })

  describe('subscribe()', () => {
    it('should call the callback immediately and on every change', async () => {
      const count = signal(0)
      const fn = vi.fn()
      count.subscribe(fn)
      expect(fn.mock.calls).toEqual([[0]])
      count.value = 1
      await Promise.resolve()
      expect(fn.mock.calls).toEqual([[0], [1]])
    })

    it('should stop calling the callback after unsubscribe', async () => {
      const count = signal(0)
      const fn = vi.fn()
      const unsubscribe = count.subscribe(fn)
      unsubscribe()
      count.value = 1
      await Promise.resolve()
      expect(fn).toHaveBeenCalledTimes(1)
    })

    it('should not track the signals read in the callback', async () => {
      const a = signal(0)
      const b = signal(0)
      const fn = vi.fn(() => {
        b.value
      })
      a.subscribe(fn)
      b.value++
      await Promise.resolve()
      expect(fn).toHaveBeenCalledTimes(1)
    })

    it('should not call the callback if the computed value is not changed', () => {
      const count = signal(1)
      const isPositive = computed(() => count.value > 0)
      const fn = vi.fn()
      isPositive.subscribe(fn)
      batch(() => {
        count.value = 2
      })
      expect(fn.mock.calls).toEqual([[true]])
      batch(() => {
        count.value = -1
      })
      expect(fn.mock.calls).toEqual([[true], [false]])
    })
  })
})

describe('computed', () => {
  it('should derive the value', () => {
    const count = signal(1)
    const double = computed(() => count.value * 2)
    expect(double.value).toBe(2)
    count.value = 2
    expect(double.value).toBe(4)
    expect(double.peek()).toBe(4)
  })

  it('should be lazy and cached', () => {
    const count = signal(1)
    const fn = vi.fn(() => count.value * 2)
    const double = computed(fn)
    expect(fn).not.toHaveBeenCalled()
    double.value
    double.value
    expect(fn).toHaveBeenCalledTimes(1)
    count.value = 2
    expect(fn).toHaveBeenCalledTimes(1)
    double.value
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('should be read-only', () => {
    const double = computed(() => 2)
    expect(() => {
      ;(double as { value: number }).value = 1
    }).toThrow(TypeError)
  })

  it('should chain', () => {
    const count = signal(1)
    const double = computed(() => count.value * 2)
    const quadruple = computed(() => double.value * 2)
    expect(quadruple.value).toBe(4)
    count.value = 2
    expect(quadruple.value).toBe(8)
  })

  it('should track the dependencies dynamically', () => {
    const flag = signal(true)
    const a = signal('a')
    const b = signal('b')
    const fn = vi.fn(() => (flag.value ? a.value : b.value))
    const result = computed(fn)
    expect(result.value).toBe('a')
    b.value = 'B'
    expect(result.value).toBe('a')
    expect(fn).toHaveBeenCalledTimes(1)
    flag.value = false
    expect(result.value).toBe('B')
    a.value = 'A'
    expect(result.value).toBe('B')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('should not be glitchy in a diamond dependency', () => {
    const count = signal(1)
    const double = computed(() => count.value * 2)
    const triple = computed(() => count.value * 3)
    const values: number[] = []
    effect(() => {
      values.push(double.value + triple.value)
    })
    batch(() => {
      count.value = 2
    })
    expect(values).toEqual([5, 10])
  })

  it('should be up to date without subscribers', () => {
    const count = signal(1)
    const other = signal(0)
    const fn = vi.fn(() => count.value * 2)
    const double = computed(fn)
    const quadruple = computed(() => double.value * 2)
    expect(quadruple.value).toBe(4)
    count.value = 2
    count.value = 3
    expect(quadruple.value).toBe(12)
    expect(fn).toHaveBeenCalledTimes(2)
    // not evaluated again if the dependencies are not changed
    other.value++
    expect(quadruple.value).toBe(12)
    expect(double.value).toBe(6)
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('should be up to date after the subscribers are gone', () => {
    const count = signal(1)
    const fn = vi.fn(() => count.value * 2)
    const double = computed(fn)
    const values: number[] = []
    const dispose = effect(() => {
      values.push(double.value)
    })
    batch(() => {
      count.value = 2
    })
    expect(values).toEqual([2, 4])
    dispose()
    expect(double.value).toBe(4)
    expect(fn).toHaveBeenCalledTimes(2)
    count.value = 3
    expect(double.value).toBe(6)

    // subscribed again
    const dispose2 = effect(() => {
      values.push(double.value)
    })
    batch(() => {
      count.value = 4
    })
    expect(values).toEqual([2, 4, 6, 8])
    expect(fn).toHaveBeenCalledTimes(4)
    dispose2()
  })

  it('should not re-run the effect if the value is not changed', () => {
    const count = signal(1)
    const isPositive = computed(() => count.value > 0)
    const label = computed(() => (isPositive.value ? 'positive' : 'negative'))
    const fn = vi.fn(() => {
      label.value
    })
    effect(fn)
    batch(() => {
      count.value = 2
    })
    expect(fn).toHaveBeenCalledTimes(1)
    batch(() => {
      count.value = -1
    })
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('should not be referenced by the dependencies without subscribers', async () => {
    const config = signal({ siteName: 'Hono' })
    const create = () => {
      const captured = {}
      const title = computed(() => [config.value.siteName, captured])
      title.value
      return new WeakRef(captured)
    }
    expect(await isCollected(create())).toBe(true)
  })

  it('should not be referenced by the dependencies after the subscribers are gone', async () => {
    const count = signal(0)
    const create = () => {
      const captured = {}
      const double = computed(() => [count.value * 2, captured])
      const quadruple = computed(() => double.value)
      effect(() => {
        quadruple.value
      })()
      quadruple.subscribe(() => {})()
      return new WeakRef(captured)
    }
    expect(await isCollected(create())).toBe(true)
  })

  it('should cache and rethrow an error', () => {
    const count = signal(0)
    const fn = vi.fn(() => {
      if (count.value === 0) {
        throw new Error('zero')
      }
      return count.value
    })
    const result = computed(fn)
    expect(() => result.value).toThrow('zero')
    expect(() => result.value).toThrow('zero')
    expect(fn).toHaveBeenCalledTimes(1)
    count.value = 1
    expect(result.value).toBe(1)
  })

  it('should throw on a cycle', () => {
    const a: ReadonlySignal<number> = computed(() => b.value)
    const b: ReadonlySignal<number> = computed(() => a.value)
    expect(() => a.value).toThrow('Cycle detected')
  })
})

describe('effect', () => {
  it('should run immediately', () => {
    const fn = vi.fn()
    effect(fn)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('should re-run in a microtask when a dependency changes', async () => {
    const count = signal(0)
    const values: number[] = []
    effect(() => {
      values.push(count.value)
    })
    count.value = 1
    count.value = 2
    expect(values).toEqual([0])
    await Promise.resolve()
    expect(values).toEqual([0, 2])
  })

  it('should not re-run if the same value is set', async () => {
    const count = signal(0)
    const fn = vi.fn(() => {
      count.value
    })
    effect(fn)
    count.value = 0
    await Promise.resolve()
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('should re-run when a computed dependency changes', async () => {
    const count = signal(1)
    const double = computed(() => count.value * 2)
    const values: number[] = []
    effect(() => {
      values.push(double.value)
    })
    count.value = 2
    await Promise.resolve()
    expect(values).toEqual([2, 4])
  })

  it('should clean up the dependencies that are no longer read', async () => {
    const flag = signal(true)
    const a = signal('a')
    const b = signal('b')
    const values: string[] = []
    effect(() => {
      values.push(flag.value ? a.value : b.value)
    })
    flag.value = false
    await Promise.resolve()
    expect(values).toEqual(['a', 'b'])
    a.value = 'A'
    await Promise.resolve()
    expect(values).toEqual(['a', 'b'])
    b.value = 'B'
    await Promise.resolve()
    expect(values).toEqual(['a', 'b', 'B'])
  })

  it('should call the cleanup function before the next run and on dispose', async () => {
    const count = signal(0)
    const log: string[] = []
    const dispose = effect(() => {
      const value = count.value
      log.push(`run ${value}`)
      return () => {
        log.push(`cleanup ${value}`)
      }
    })
    count.value = 1
    await Promise.resolve()
    expect(log).toEqual(['run 0', 'cleanup 0', 'run 1'])
    dispose()
    expect(log).toEqual(['run 0', 'cleanup 0', 'run 1', 'cleanup 1'])
  })

  it('should not run after dispose', async () => {
    const count = signal(0)
    const fn = vi.fn(() => {
      count.value
    })
    const dispose = effect(fn)
    count.value = 1
    dispose()
    await Promise.resolve()
    count.value = 2
    await Promise.resolve()
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('should re-run if it writes to another signal', async () => {
    const count = signal(1)
    const double = signal(0)
    const values: number[] = []
    effect(() => {
      double.value = count.value * 2
    })
    effect(() => {
      values.push(double.value)
    })
    expect(values).toEqual([2])
    count.value = 2
    await Promise.resolve()
    expect(values).toEqual([2, 4])
  })

  it('should run the remaining effects if an effect throws', () => {
    const count = signal(0)
    const fn = vi.fn(() => {
      count.value
    })
    effect(() => {
      if (count.value === 1) {
        throw new Error('one')
      }
    })
    effect(fn)
    expect(() =>
      batch(() => {
        count.value = 1
      })
    ).toThrow('one')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('should throw on an infinite loop', () => {
    const count = signal(0)
    effect(() => {
      count.value = untracked(() => count.value) + (count.value === 0 ? 0 : 1)
    })
    expect(() =>
      batch(() => {
        count.value = 1
      })
    ).toThrow('Cycle detected')
  })
})

describe('batch', () => {
  it('should run the effects once, synchronously at the end', () => {
    const a = signal(1)
    const b = signal(2)
    const values: number[] = []
    effect(() => {
      values.push(a.value + b.value)
    })
    batch(() => {
      a.value = 10
      b.value = 20
      expect(values).toEqual([3])
    })
    expect(values).toEqual([3, 30])
  })

  it('should flush at the end of the outermost batch', () => {
    const count = signal(0)
    const values: number[] = []
    effect(() => {
      values.push(count.value)
    })
    batch(() => {
      batch(() => {
        count.value = 1
      })
      expect(values).toEqual([0])
      count.value = 2
    })
    expect(values).toEqual([0, 2])
  })

  it('should return the result of the callback', () => {
    expect(batch(() => 'result')).toBe('result')
  })

  it('should not run the effects again in the microtask', async () => {
    const count = signal(0)
    const fn = vi.fn(() => {
      count.value
    })
    effect(fn)
    count.value = 1
    batch(() => {
      count.value = 2
    })
    expect(fn).toHaveBeenCalledTimes(2)
    await Promise.resolve()
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('should run the effects once if batch() is called in an effect', () => {
    const a = signal(0)
    const b = signal(0)
    const values: number[] = []
    effect(() => {
      const value = a.value
      batch(() => {
        b.value = value
      })
    })
    effect(() => {
      values.push(b.value)
    })
    batch(() => {
      a.value = 1
    })
    expect(values).toEqual([0, 1])
  })

  it('should flush even if the callback throws', () => {
    const count = signal(0)
    const values: number[] = []
    effect(() => {
      values.push(count.value)
    })
    expect(() =>
      batch(() => {
        count.value = 1
        throw new Error('failed')
      })
    ).toThrow('failed')
    expect(values).toEqual([0, 1])
  })
})

describe('untracked', () => {
  it('should read the value without tracking', async () => {
    const a = signal(1)
    const b = signal(2)
    const values: number[] = []
    effect(() => {
      values.push(a.value + untracked(() => b.value))
    })
    b.value = 20
    await Promise.resolve()
    expect(values).toEqual([3])
    a.value = 10
    await Promise.resolve()
    expect(values).toEqual([3, 30])
  })

  it('should return the result of the callback', () => {
    expect(untracked(() => 'result')).toBe('result')
  })
})

describe('types', () => {
  it('should accept a signal of the attribute type', () => {
    const href = signal('/')
    const hidden = computed(() => true)
    const count = signal(0)
    const handler = signal(() => {})
    expect(<a href={href} hidden={hidden} />).toBeTruthy()
    // @ts-expect-error the value type does not match
    expect(<a href={count} />).toBeTruthy()
    // @ts-expect-error an event handler does not accept a signal
    expect(<a onClick={handler} />).toBeTruthy()
    expect(() => {
      // @ts-expect-error a computed is read-only
      hidden.value = false
    }).toThrow(TypeError)
  })
})

describe('SSR', () => {
  it('should render a signal as a child', () => {
    const count = signal(1)
    const double = computed(() => count.value * 2)
    expect(
      (
        <p>
          {count} * 2 = {double}
        </p>
      ).toString()
    ).toBe('<p>1 * 2 = 2</p>')
  })

  it('should escape the value', () => {
    const text = signal('<b>"bold"</b>')
    expect((<p title={text}>{text}</p>).toString()).toBe(
      '<p title="&lt;b&gt;&quot;bold&quot;&lt;/b&gt;">&lt;b&gt;&quot;bold&quot;&lt;/b&gt;</p>'
    )
  })

  it('should render nothing for null, undefined and boolean', () => {
    expect(
      (
        <p>
          {signal(null)}
          {signal(undefined)}
          {signal(false)}
          {signal(true)}
        </p>
      ).toString()
    ).toBe('<p></p>')
  })

  it('should render a signal as an attribute', () => {
    const cls = signal('a')
    const hidden = signal(true)
    const disabled = signal(false)
    const title = signal<string | undefined>(undefined)
    const style = signal({ fontSize: 10 })
    expect(
      (
        <button class={cls} hidden={hidden} disabled={disabled} title={title} style={style} />
      ).toString()
    ).toBe('<button class="a" hidden="" style="font-size:10px"></button>')
  })

  it('should render the signals created in a component', () => {
    const Counter = ({ initial }: { initial: number }) => {
      const count = signal(initial)
      const double = computed(() => count.value * 2)
      return (
        <p>
          {count} * 2 = {double.value}
        </p>
      )
    }
    expect((<Counter initial={1} />).toString()).toBe('<p>1 * 2 = 2</p>')
    // a signal is created for each render
    expect((<Counter initial={2} />).toString()).toBe('<p>2 * 2 = 4</p>')
  })

  it('should not run the effect in a component', () => {
    const count = signal(0)
    const fn = vi.fn(() => {
      count.value
    })
    const Child = () => {
      const dispose = effect(fn)
      dispose()
      return <span>child</span>
    }
    const App = () => {
      effect(fn)
      return (
        <p>
          <Child />
        </p>
      )
    }
    expect((<App />).toString()).toBe('<p><span>child</span></p>')
    batch(() => {
      count.value = 1
    })
    expect(fn).not.toHaveBeenCalled()
  })

  it('should run the effect outside of a component', () => {
    const App = () => {
      throw new Error('failed')
    }
    expect(() => (<App />).toString()).toThrow('failed')
    expect((<p>text</p>).toString()).toBe('<p>text</p>')

    const count = signal(0)
    const fn = vi.fn(() => {
      count.value
    })
    const dispose = effect(fn)
    batch(() => {
      count.value = 1
    })
    expect(fn).toHaveBeenCalledTimes(2)
    dispose()
  })

  it('should not keep the computed in a component after the render', async () => {
    const config = signal({ siteName: 'Hono' })
    const refs: WeakRef<object>[] = []
    const Page = ({ path }: { path: string }) => {
      const captured = {}
      refs.push(new WeakRef(captured))
      const title = computed(() => [config.value.siteName, path, captured][0] as string)
      return <title>{title}</title>
    }
    expect((<Page path='/' />).toString()).toBe('<title>Hono</title>')
    expect(await isCollected(refs[0])).toBe(true)
  })

  it('should not subscribe to the signal', () => {
    const text = signal('a')
    const counts = spySubscription(text)
    expect((<p class={text}>{text}</p>).toString()).toBe('<p class="a">a</p>')
    expect(counts.subscribed).toBe(0)
  })
})

describe('DOM', () => {
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
    global.DOMException = dom.window.DOMException
    root = document.getElementById('root') as HTMLElement
  })

  describe('child', () => {
    it('should update the text node without re-rendering the component', () => {
      const count = signal(0)
      const App = vi.fn(() => <p>Count: {count}</p>)
      render(<App />, root)
      expect(root.innerHTML).toBe('<p>Count: 0</p>')
      const p = root.querySelector('p') as HTMLElement
      const text = p.childNodes[1]

      batch(() => {
        count.value = 1
      })
      expect(root.innerHTML).toBe('<p>Count: 1</p>')
      expect(root.querySelector('p')).toBe(p)
      expect(p.childNodes[1]).toBe(text)
      expect(App).toHaveBeenCalledTimes(1)
    })

    it('should update in a microtask without batch()', async () => {
      const count = signal(0)
      render(<p>{count}</p>, root)
      count.value = 1
      expect(root.innerHTML).toBe('<p>0</p>')
      await Promise.resolve()
      expect(root.innerHTML).toBe('<p>1</p>')
    })

    it('should update with a computed', () => {
      const count = signal(1)
      const double = computed(() => count.value * 2)
      render(<p>{double}</p>, root)
      expect(root.innerHTML).toBe('<p>2</p>')
      batch(() => {
        count.value = 2
      })
      expect(root.innerHTML).toBe('<p>4</p>')
    })

    it('should update the signals in an array and next to each other', () => {
      const a = signal('a')
      const b = signal('b')
      render(
        <p>
          {a}
          {b}
          {[a, '-', b]}
        </p>,
        root
      )
      expect(root.innerHTML).toBe('<p>aba-b</p>')
      batch(() => {
        a.value = 'A'
        b.value = 'B'
      })
      expect(root.innerHTML).toBe('<p>ABA-B</p>')
    })

    it('should render an empty text for null, undefined and boolean', () => {
      const value = signal<string | null | undefined | boolean>(null)
      render(<p>{value}</p>, root)
      expect(root.innerHTML).toBe('<p></p>')
      for (const [next, html] of [
        ['text', '<p>text</p>'],
        [undefined, '<p></p>'],
        [true, '<p></p>'],
        [false, '<p></p>'],
      ] as const) {
        batch(() => {
          value.value = next
        })
        expect(root.innerHTML).toBe(html)
      }
    })

    it('should not interpret the value as HTML', () => {
      const text = signal('<b>bold</b>')
      render(<p>{text}</p>, root)
      expect(root.innerHTML).toBe('<p>&lt;b&gt;bold&lt;/b&gt;</p>')
    })

    it('should keep the subscription when the component is re-rendered', async () => {
      const count = signal(0)
      const counts = spySubscription(count)
      let setLabel: (label: string) => void = () => {}
      const App = () => {
        const [label, _setLabel] = useState('a')
        setLabel = _setLabel
        return (
          <p>
            {label}: {count}
          </p>
        )
      }
      render(<App />, root)
      expect(root.innerHTML).toBe('<p>a: 0</p>')
      batch(() => {
        count.value = 1
      })
      setLabel('b')
      await Promise.resolve()
      expect(root.innerHTML).toBe('<p>b: 1</p>')
      batch(() => {
        count.value = 2
      })
      expect(root.innerHTML).toBe('<p>b: 2</p>')
      expect(counts).toEqual({ subscribed: 1, unsubscribed: 0 })
    })

    it('should switch the subscription when the signal is replaced', async () => {
      const a = signal('a')
      const b = signal('b')
      const countsA = spySubscription(a)
      const countsB = spySubscription(b)
      let setFlag: (flag: boolean) => void = () => {}
      const App = () => {
        const [flag, _setFlag] = useState(true)
        setFlag = _setFlag
        return <p>{flag ? a : b}</p>
      }
      render(<App />, root)
      expect(root.innerHTML).toBe('<p>a</p>')
      setFlag(false)
      await Promise.resolve()
      expect(root.innerHTML).toBe('<p>b</p>')
      expect(countsA).toEqual({ subscribed: 1, unsubscribed: 1 })
      expect(countsB).toEqual({ subscribed: 1, unsubscribed: 0 })

      batch(() => {
        a.value = 'A'
        b.value = 'B'
      })
      expect(root.innerHTML).toBe('<p>B</p>')
    })

    it('should unsubscribe when the signal is replaced with a text', async () => {
      const count = signal(0)
      const counts = spySubscription(count)
      let setFlag: (flag: boolean) => void = () => {}
      const App = () => {
        const [flag, _setFlag] = useState(true)
        setFlag = _setFlag
        return <p>{flag ? count : 'text'}</p>
      }
      render(<App />, root)
      setFlag(false)
      await Promise.resolve()
      expect(root.innerHTML).toBe('<p>text</p>')
      expect(counts).toEqual({ subscribed: 1, unsubscribed: 1 })
      batch(() => {
        count.value = 1
      })
      expect(root.innerHTML).toBe('<p>text</p>')
    })

    it('should unsubscribe on unmount', async () => {
      const count = signal(0)
      const counts = spySubscription(count)
      let setShow: (show: boolean) => void = () => {}
      const Counter = () => <p>{count}</p>
      const App = () => {
        const [show, _setShow] = useState(true)
        setShow = _setShow
        return <div>{show && <Counter />}</div>
      }
      render(<App />, root)
      expect(root.innerHTML).toBe('<div><p>0</p></div>')
      expect(counts).toEqual({ subscribed: 1, unsubscribed: 0 })

      setShow(false)
      await Promise.resolve()
      expect(root.innerHTML).toBe('<div></div>')
      expect(counts).toEqual({ subscribed: 1, unsubscribed: 1 })

      setShow(true)
      await Promise.resolve()
      batch(() => {
        count.value = 1
      })
      expect(root.innerHTML).toBe('<div><p>1</p></div>')
      expect(counts).toEqual({ subscribed: 2, unsubscribed: 1 })
    })
  })

  describe('component', () => {
    it('should re-render the component when a signal read in it changes', () => {
      const count = signal(0)
      const App = vi.fn(() => <p>{count.value % 2 === 0 ? 'even' : 'odd'}</p>)
      render(<App />, root)
      expect(root.innerHTML).toBe('<p>even</p>')
      const p = root.querySelector('p')

      batch(() => {
        count.value = 1
      })
      expect(root.innerHTML).toBe('<p>odd</p>')
      expect(root.querySelector('p')).toBe(p)
      expect(App).toHaveBeenCalledTimes(2)
    })

    it('should re-render in a microtask without batch()', async () => {
      const count = signal(0)
      render(<App />, root)
      function App() {
        return <p>{count.value * 2}</p>
      }
      count.value = 1
      expect(root.innerHTML).toBe('<p>0</p>')
      await Promise.resolve()
      expect(root.innerHTML).toBe('<p>2</p>')
    })

    it('should re-render once if multiple signals change', async () => {
      const a = signal(1)
      const b = signal(2)
      const App = vi.fn(() => <p>{a.value + b.value}</p>)
      render(<App />, root)
      a.value = 10
      b.value = 20
      await Promise.resolve()
      expect(root.innerHTML).toBe('<p>30</p>')
      expect(App).toHaveBeenCalledTimes(2)
    })

    it('should re-render with a computed', () => {
      const count = signal(1)
      const double = computed(() => count.value * 2)
      const App = () => <p>{double.value > 2 ? 'big' : 'small'}</p>
      render(<App />, root)
      expect(root.innerHTML).toBe('<p>small</p>')
      batch(() => {
        count.value = 2
      })
      expect(root.innerHTML).toBe('<p>big</p>')
    })

    it('should render a list and a condition', () => {
      const items = signal(['a', 'b'])
      const App = () =>
        items.value.length ? (
          <ul>
            {items.value.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : (
          <p>empty</p>
        )
      render(<App />, root)
      expect(root.innerHTML).toBe('<ul><li>a</li><li>b</li></ul>')
      batch(() => {
        items.value = [...items.value, 'c']
      })
      expect(root.innerHTML).toBe('<ul><li>a</li><li>b</li><li>c</li></ul>')
      batch(() => {
        items.value = []
      })
      expect(root.innerHTML).toBe('<p>empty</p>')
    })

    it('should not re-render the component if the signal is passed as it is', () => {
      const text = signal('a')
      const App = vi.fn(() => <p class={text}>{text}</p>)
      render(<App />, root)
      batch(() => {
        text.value = 'b'
      })
      expect(root.innerHTML).toBe('<p class="b">b</p>')
      expect(App).toHaveBeenCalledTimes(1)
    })

    it('should re-render only the component that reads the signal', () => {
      const count = signal(0)
      const Child = vi.fn(() => <span>{count.value}</span>)
      const Sibling = vi.fn(() => <span>sibling</span>)
      const App = vi.fn(() => (
        <p>
          <Child />
          <Sibling />
        </p>
      ))
      render(<App />, root)
      batch(() => {
        count.value = 1
      })
      expect(root.innerHTML).toBe('<p><span>1</span><span>sibling</span></p>')
      expect(App).toHaveBeenCalledTimes(1)
      expect(Sibling).toHaveBeenCalledTimes(1)
      expect(Child).toHaveBeenCalledTimes(2)
    })

    it('should stop tracking the signals that are no longer read', () => {
      const flag = signal(true)
      const a = signal('a')
      const b = signal('b')
      const App = vi.fn(() => <p>{flag.value ? a.value : b.value}</p>)
      render(<App />, root)
      batch(() => {
        flag.value = false
      })
      expect(root.innerHTML).toBe('<p>b</p>')
      expect(App).toHaveBeenCalledTimes(2)
      batch(() => {
        a.value = 'A'
      })
      expect(App).toHaveBeenCalledTimes(2)
      batch(() => {
        b.value = 'B'
      })
      expect(root.innerHTML).toBe('<p>B</p>')
      expect(App).toHaveBeenCalledTimes(3)
    })

    it('should update the signal from an event handler', () => {
      const count = signal(0)
      const App = () => (
        <button onClick={() => count.value++}>{count.value === 0 ? 'zero' : count.value}</button>
      )
      render(<App />, root)
      const button = root.querySelector('button') as HTMLButtonElement
      batch(() => button.click())
      expect(root.innerHTML).toBe('<button>1</button>')
      batch(() => button.click())
      expect(root.innerHTML).toBe('<button>2</button>')
    })

    it('should stop tracking on unmount', () => {
      const show = signal(true)
      const count = signal(0)
      const Counter = vi.fn(() => <p>{count.value}</p>)
      const App = () => <div>{show.value && <Counter />}</div>
      render(<App />, root)
      expect(root.innerHTML).toBe('<div><p>0</p></div>')
      batch(() => {
        show.value = false
      })
      expect(root.innerHTML).toBe('<div></div>')
      batch(() => {
        count.value = 1
      })
      expect(root.innerHTML).toBe('<div></div>')
      expect(Counter).toHaveBeenCalledTimes(1)
    })

    it('should not re-render the component that is unmounted in the same batch', () => {
      const show = signal(true)
      const count = signal(0)
      const Counter = vi.fn(() => <p>{count.value}</p>)
      const App = () => <div>{show.value && <Counter />}</div>
      render(<App />, root)
      batch(() => {
        show.value = false
        count.value = 1
      })
      expect(root.innerHTML).toBe('<div></div>')
      batch(() => {
        count.value = 2
      })
      expect(root.innerHTML).toBe('<div></div>')
      expect(Counter).toHaveBeenCalledTimes(1)
    })

    it('should not re-render the child twice if the parent is re-rendered first', () => {
      const count = signal(0)
      const Child = vi.fn(() => <span>{count.value}</span>)
      const App = () => (
        <p>
          {count.value}
          <Child />
        </p>
      )
      render(<App />, root)
      batch(() => {
        count.value = 1
      })
      expect(root.innerHTML).toBe('<p>1<span>1</span></p>')
      expect(Child).toHaveBeenCalledTimes(2)
    })

    it('should render the fallback of ErrorBoundary if the re-render throws', () => {
      const count = signal(0)
      const Child = () => {
        if (count.value === 1) {
          throw new Error('failed')
        }
        return <span>{count.value}</span>
      }
      const App = () => (
        <ErrorBoundary fallback={<p>fallback</p>}>
          <Child />
        </ErrorBoundary>
      )
      render(<App />, root)
      expect(root.innerHTML).toBe('<span>0</span>')
      batch(() => {
        count.value = 1
      })
      expect(root.innerHTML).toBe('<p>fallback</p>')
    })

    it('should not re-render the memoized child', () => {
      const count = signal(0)
      const Child = vi.fn(() => <span>child</span>)
      const MemoChild = memo(Child)
      const App = () => (
        <p>
          {count.value}
          <MemoChild />
        </p>
      )
      render(<App />, root)
      batch(() => {
        count.value = 1
      })
      expect(root.innerHTML).toBe('<p>1<span>child</span></p>')
      expect(Child).toHaveBeenCalledTimes(1)
    })

    it('should work with useState in the same component', async () => {
      const count = signal(0)
      let setLabel: (label: string) => void = () => {}
      const App = () => {
        const [label, _setLabel] = useState('a')
        setLabel = _setLabel
        return (
          <p>
            {label}:{count.value}
          </p>
        )
      }
      render(<App />, root)
      setLabel('b')
      await Promise.resolve()
      batch(() => {
        count.value = 1
      })
      expect(root.innerHTML).toBe('<p>b:1</p>')
    })
  })

  describe('signal(), computed() and effect() in a component', () => {
    it('should keep the signal across re-renders', () => {
      const Counter = () => {
        const count = signal(0)
        return <button onClick={() => count.value++}>{count.value}</button>
      }
      render(<Counter />, root)
      const button = root.querySelector('button') as HTMLButtonElement
      batch(() => button.click())
      expect(root.innerHTML).toBe('<button>1</button>')
      batch(() => button.click())
      expect(root.innerHTML).toBe('<button>2</button>')
    })

    it('should keep the signal that is passed as it is', () => {
      const Counter = vi.fn(() => {
        const count = signal(0)
        return <button onClick={() => count.value++}>{count}</button>
      })
      render(<Counter />, root)
      const button = root.querySelector('button') as HTMLButtonElement
      batch(() => button.click())
      batch(() => button.click())
      expect(root.innerHTML).toBe('<button>2</button>')
      expect(Counter).toHaveBeenCalledTimes(1)
    })

    it('should have a state for each instance', () => {
      const Counter = () => {
        const count = signal(0)
        return <button onClick={() => count.value++}>{count.value}</button>
      }
      render(
        <div>
          <Counter />
          <Counter />
        </div>,
        root
      )
      const [first, second] = root.querySelectorAll('button')
      batch(() => first.click())
      batch(() => second.click())
      batch(() => second.click())
      expect(root.innerHTML).toBe('<div><button>1</button><button>2</button></div>')
    })

    it('should keep the signals in the order of the calls', () => {
      const App = () => {
        const a = signal('a')
        const b = signal('b')
        return (
          <button
            onClick={() => {
              a.value += 'a'
              b.value += 'b'
            }}
          >
            {a.value}
            {b.value}
          </button>
        )
      }
      render(<App />, root)
      const button = root.querySelector('button') as HTMLButtonElement
      batch(() => button.click())
      batch(() => button.click())
      expect(root.innerHTML).toBe('<button>aaabbb</button>')
    })

    it('should keep the state when the parent is re-rendered', () => {
      const label = signal('a')
      const Counter = () => {
        const count = signal(0)
        return <button onClick={() => count.value++}>{count.value}</button>
      }
      const App = () => (
        <div>
          {label.value}
          <Counter />
        </div>
      )
      render(<App />, root)
      batch(() => (root.querySelector('button') as HTMLButtonElement).click())
      batch(() => {
        label.value = 'b'
      })
      expect(root.innerHTML).toBe('<div>b<button>1</button></div>')
    })

    it('should reset the state when the component is mounted again', () => {
      const show = signal(true)
      const Counter = () => {
        const count = signal(0)
        return <button onClick={() => count.value++}>{count.value}</button>
      }
      const App = () => <div>{show.value && <Counter />}</div>
      render(<App />, root)
      batch(() => (root.querySelector('button') as HTMLButtonElement).click())
      expect(root.innerHTML).toBe('<div><button>1</button></div>')
      batch(() => {
        show.value = false
      })
      batch(() => {
        show.value = true
      })
      expect(root.innerHTML).toBe('<div><button>0</button></div>')
    })

    it('should keep the computed across re-renders', () => {
      const fn = vi.fn()
      const Counter = () => {
        const count = signal(1)
        const double = computed(() => {
          fn()
          return count.value * 2
        })
        return <button onClick={() => count.value++}>{double.value}</button>
      }
      render(<Counter />, root)
      expect(root.innerHTML).toBe('<button>2</button>')
      batch(() => (root.querySelector('button') as HTMLButtonElement).click())
      expect(root.innerHTML).toBe('<button>4</button>')
      expect(fn).toHaveBeenCalledTimes(2)
    })

    it('should use the function of the latest render in computed() and effect()', () => {
      const count = signal(0)
      const log: string[] = []
      const Child = ({ label }: { label: string }) => {
        const text = computed(() => `${label}:${count.value}`)
        effect(() => {
          log.push(`${label}:${count.value}`)
        })
        return <span>{text}</span>
      }
      const label = signal('a')
      const App = () => <Child label={label.value} />
      render(<App />, root)
      expect(root.innerHTML).toBe('<span>a:0</span>')
      batch(() => {
        label.value = 'b'
      })
      // a change of props does not re-run them
      expect(root.innerHTML).toBe('<span>a:0</span>')
      batch(() => {
        count.value = 1
      })
      expect(root.innerHTML).toBe('<span>b:1</span>')
      expect(log).toEqual(['a:0', 'b:1'])
    })

    it('should run the effect once and re-run it when a dependency changes', () => {
      const log: string[] = []
      const Counter = () => {
        const count = signal(0)
        effect(() => {
          log.push(`run ${count.value}`)
        })
        return <button onClick={() => count.value++}>{count.value}</button>
      }
      render(<Counter />, root)
      expect(log).toEqual(['run 0'])
      batch(() => (root.querySelector('button') as HTMLButtonElement).click())
      expect(root.innerHTML).toBe('<button>1</button>')
      expect(log).toEqual(['run 0', 'run 1'])
    })

    it('should dispose the effect on unmount', () => {
      const show = signal(true)
      const count = signal(0)
      const log: string[] = []
      const Counter = () => {
        effect(() => {
          const value = count.value
          log.push(`run ${value}`)
          return () => {
            log.push(`cleanup ${value}`)
          }
        })
        return <p>counter</p>
      }
      const App = () => <div>{show.value && <Counter />}</div>
      render(<App />, root)
      expect(log).toEqual(['run 0'])
      batch(() => {
        show.value = false
      })
      expect(log).toEqual(['run 0', 'cleanup 0'])
      batch(() => {
        count.value = 1
      })
      expect(log).toEqual(['run 0', 'cleanup 0'])
    })

    it('should not keep the computed after unmount', async () => {
      const show = signal(true)
      const count = signal(0)
      const refs: WeakRef<object>[] = []
      const Child = () => {
        const captured = {}
        refs.push(new WeakRef(captured))
        const double = computed(() => [count.value * 2, captured][0] as number)
        const quadruple = computed(() => double.value * 2)
        effect(() => {
          quadruple.value
        })
        return <p>{double.value}</p>
      }
      const App = () => <div>{show.value && <Child />}</div>
      render(<App />, root)
      batch(() => {
        count.value = 1
      })
      expect(root.innerHTML).toBe('<div><p>2</p></div>')
      batch(() => {
        show.value = false
      })
      expect(root.innerHTML).toBe('<div></div>')
      expect(await isCollected(refs[0])).toBe(true)
      expect(await isCollected(refs[1])).toBe(true)
    })

    it('should not track the signals read in the effect as dependencies of the component', () => {
      const count = signal(0)
      const App = vi.fn(() => {
        effect(() => {
          count.value
        })
        return <p>text</p>
      })
      render(<App />, root)
      batch(() => {
        count.value = 1
      })
      expect(App).toHaveBeenCalledTimes(1)
    })

    it('should dispose the effect if the first render throws', () => {
      const count = signal(0)
      const fn = vi.fn(() => {
        count.value
      })
      const App = () => {
        effect(fn)
        throw new Error('failed')
      }
      expect(() => render(<App />, root)).toThrow('failed')
      batch(() => {
        count.value = 1
      })
      expect(fn).toHaveBeenCalledTimes(1)
    })

    it('should create a new signal outside of the render', () => {
      const created: unknown[] = []
      const App = () => {
        const count = signal(0)
        return (
          <button
            onClick={() => {
              created.push(signal(0), signal(0))
              count.value++
            }}
          >
            {count.value}
          </button>
        )
      }
      render(<App />, root)
      batch(() => (root.querySelector('button') as HTMLButtonElement).click())
      expect(root.innerHTML).toBe('<button>1</button>')
      expect(created[0]).not.toBe(created[1])
    })

    it('should create a new signal in a computed evaluated during the render', () => {
      const created: unknown[] = []
      const rerender = signal(0)
      const App = () => {
        const inner = computed(() => {
          const s = signal(rerender.value)
          created.push(s)
          return s
        })
        const count = signal(10)
        return (
          <p>
            {inner.value.value}:{count.value}
          </p>
        )
      }
      render(<App />, root)
      expect(root.innerHTML).toBe('<p>0:10</p>')
      batch(() => {
        rerender.value = 1
      })
      expect(root.innerHTML).toBe('<p>1:10</p>')
      expect(created.length).toBe(2)
      expect(created[0]).not.toBe(created[1])
    })
  })

  describe('attribute', () => {
    it('should update the attribute without re-rendering the component', () => {
      const cls = signal('a')
      const App = vi.fn(() => <p class={cls}>text</p>)
      render(<App />, root)
      expect(root.innerHTML).toBe('<p class="a">text</p>')
      const p = root.querySelector('p')

      batch(() => {
        cls.value = 'b'
      })
      expect(root.innerHTML).toBe('<p class="b">text</p>')
      expect(root.querySelector('p')).toBe(p)
      expect(App).toHaveBeenCalledTimes(1)
    })

    it('should add and remove the attribute', () => {
      const disabled = signal(false)
      const title = signal<string | undefined>(undefined)
      render(<button disabled={disabled} title={title} />, root)
      expect(root.innerHTML).toBe('<button></button>')
      batch(() => {
        disabled.value = true
        title.value = 'title'
      })
      expect(root.innerHTML).toBe('<button disabled="" title="title"></button>')
      batch(() => {
        disabled.value = false
        title.value = undefined
      })
      expect(root.innerHTML).toBe('<button></button>')
    })

    it('should normalize the attribute name', () => {
      const cls = signal('a')
      render(<p className={cls} />, root)
      expect(root.innerHTML).toBe('<p class="a"></p>')
    })

    it('should update the style', () => {
      const style = signal<Record<string, unknown> | string>({ fontSize: 10 })
      render(<p style={style} />, root)
      expect(root.innerHTML).toBe('<p style="font-size: 10px;"></p>')
      batch(() => {
        style.value = 'color: red;'
      })
      expect(root.innerHTML).toBe('<p style="color: red;"></p>')
    })

    it('should update the DOM properties of form elements', () => {
      const value = signal('a')
      const checked = signal(false)
      const selected = signal('b')
      render(
        <form>
          <input type='text' value={value} />
          <input type='checkbox' checked={checked} />
          <select value={selected}>
            <option value='a'>a</option>
            <option value='b'>b</option>
          </select>
        </form>,
        root
      )
      const [text, checkbox] = root.querySelectorAll('input')
      const select = root.querySelector('select') as HTMLSelectElement
      expect(text.value).toBe('a')
      expect(checkbox.checked).toBe(false)
      expect(select.value).toBe('b')

      batch(() => {
        value.value = 'b'
        checked.value = true
        selected.value = 'a'
      })
      expect(text.value).toBe('b')
      expect(checkbox.checked).toBe(true)
      expect(select.value).toBe('a')
    })

    it('should keep the subscription when the component is re-rendered', async () => {
      const cls = signal('a')
      const counts = spySubscription(cls)
      let setLabel: (label: string) => void = () => {}
      const App = () => {
        const [label, _setLabel] = useState('a')
        setLabel = _setLabel
        return <p class={cls}>{label}</p>
      }
      render(<App />, root)
      setLabel('b')
      await Promise.resolve()
      expect(root.innerHTML).toBe('<p class="a">b</p>')
      expect(counts).toEqual({ subscribed: 1, unsubscribed: 0 })
    })

    it('should switch between a signal and a static value', async () => {
      const cls = signal('a')
      const counts = spySubscription(cls)
      let setMode: (mode: number) => void = () => {}
      const App = () => {
        const [mode, _setMode] = useState(0)
        setMode = _setMode
        return mode === 0 ? <p class={cls} /> : mode === 1 ? <p class='static' /> : <p />
      }
      render(<App />, root)
      expect(root.innerHTML).toBe('<p class="a"></p>')

      setMode(1)
      await Promise.resolve()
      expect(root.innerHTML).toBe('<p class="static"></p>')
      expect(counts).toEqual({ subscribed: 1, unsubscribed: 1 })
      batch(() => {
        cls.value = 'b'
      })
      expect(root.innerHTML).toBe('<p class="static"></p>')

      setMode(0)
      await Promise.resolve()
      expect(root.innerHTML).toBe('<p class="b"></p>')
      expect(counts).toEqual({ subscribed: 2, unsubscribed: 1 })

      setMode(2)
      await Promise.resolve()
      expect(root.innerHTML).toBe('<p></p>')
      expect(counts).toEqual({ subscribed: 2, unsubscribed: 2 })
    })

    it('should not touch the other attributes', async () => {
      const cls = signal('a')
      let setMode: (mode: number) => void = () => {}
      const App = () => {
        const [mode, _setMode] = useState(0)
        setMode = _setMode
        return mode === 0 ? <p id='p' class='static' /> : <p id='p' class={cls} />
      }
      render(<App />, root)
      setMode(1)
      await Promise.resolve()
      expect(root.innerHTML).toBe('<p id="p" class="a"></p>')
    })

    it('should unsubscribe on unmount', async () => {
      const cls = signal('a')
      const title = signal('title')
      const countsCls = spySubscription(cls)
      const countsTitle = spySubscription(title)
      let setShow: (show: boolean) => void = () => {}
      const App = () => {
        const [show, _setShow] = useState(true)
        setShow = _setShow
        return (
          <div>
            {show && (
              <section>
                <p class={cls} title={title} />
              </section>
            )}
          </div>
        )
      }
      render(<App />, root)
      expect(root.innerHTML).toBe('<div><section><p class="a" title="title"></p></section></div>')

      setShow(false)
      await Promise.resolve()
      expect(root.innerHTML).toBe('<div></div>')
      expect(countsCls).toEqual({ subscribed: 1, unsubscribed: 1 })
      expect(countsTitle).toEqual({ subscribed: 1, unsubscribed: 1 })
    })
  })
})
