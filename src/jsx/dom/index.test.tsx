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
import type { NodeObject } from './render'
import { build, buildNode } from './render'
import DefaultExport, {
  cloneElement,
  cloneElement as cloneElementForDom,
  createElement as createElementForDom,
  createContext,
  useContext,
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
    global.DOMException = dom.window.DOMException
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

    it.each(['same-order', 'remove-second', 'adjacent-swap'])(
      'preserves keyed children during common updates: %s',
      (kind) => {
        const size = 100
        const ids = Array.from({ length: size }, (_, i) => i)
        const createRow = (id: number) => <div key={id}>{id}</div>
        const parent = buildNode(<section>{ids.map(createRow)}</section>) as NodeObject
        build([], parent)
        const initialChildren = parent.vC
        const nextIds = [...ids]
        if (kind === 'remove-second') {
          nextIds.splice(1, 1)
        } else if (kind === 'adjacent-swap') {
          ;[nextIds[1], nextIds[2]] = [nextIds[2], nextIds[1]]
        }
        parent.props.children = [[], ...nextIds.map(createRow)]

        build([], parent)

        expect(parent.vC).toHaveLength(nextIds.length)
        nextIds.forEach((id, i) => expect(parent.vC[i]).toBe(initialChildren[id]))
        expect(parent.vR).toHaveLength(kind === 'remove-second' ? 1 : 0)
        if (kind === 'remove-second') {
          expect(parent.vR[0]).toBe(initialChildren[1])
        }
      }
    )
  })

  describe('large keyed updates', () => {
    it.each([
      'reverse',
      'rotate-half',
      'replace-all',
      'footer-unkeyed',
      'footer-text',
      'insert-text',
      'move-text',
    ])('matches keyed list updates in linear work: %s', (kind) => {
      const measure = (size: number) => {
        let oldKeyReads = 0
        let newKeyReads = 0
        const createRow = (id: number, old = false) => {
          const row = <div>{id}</div>
          // Count both sides so node normalization cannot silently disable the check.
          Object.defineProperty(row, 'key', {
            configurable: true,
            get: () => {
              if (old) {
                oldKeyReads++
              } else {
                newKeyReads++
              }
              return id
            },
          })
          return row
        }
        const ids = Array.from({ length: size }, (_, i) => i)
        const before: Child[] = ids.map((id) => createRow(id, true))
        if (kind === 'footer-unkeyed') {
          before.push(<div>footer</div>)
        } else if (kind === 'footer-text' || kind === 'move-text') {
          before.push('original')
        }
        const parent = buildNode(<section>{before}</section>) as NodeObject
        build([], parent)
        const initial = parent.vC
        const next = [...ids]
        if (kind === 'rotate-half') {
          next.push(...next.splice(0, size / 2))
        } else if (kind === 'replace-all') {
          next.splice(0, size, ...ids.map((id) => id + size))
        } else {
          next.reverse()
        }
        const after: Child[] = next.map((id) => createRow(id))
        const expected = next.map((id) => (id < size ? initial[id] : undefined))
        if (kind === 'footer-unkeyed' || kind === 'footer-text') {
          after.push(kind === 'footer-unkeyed' ? <div>footer</div> : 'updated')
          expected.push(initial[size])
        } else if (kind === 'insert-text' || kind === 'move-text') {
          after.splice(4, 0, 'updated')
          expected.splice(4, 0, kind === 'move-text' ? initial[size] : undefined)
          if (kind === 'move-text') {
            after.splice(8, 0, 'extra')
            expected.splice(8, 0, undefined)
          }
        }
        parent.props.children = after
        oldKeyReads = newKeyReads = 0
        build([], parent)
        const reads = { old: oldKeyReads, new: newKeyReads }

        expect(parent.vC).toHaveLength(expected.length)
        expected.forEach((child, i) => {
          if (child) {
            expect(parent.vC[i]).toBe(child)
          } else {
            expect(initial.includes(parent.vC[i])).toBe(false)
          }
        })
        if (kind === 'footer-text' || kind === 'insert-text' || kind === 'move-text') {
          expect(parent.vC[kind === 'footer-text' ? size : 4]).toMatchObject({ t: 'updated' })
        }
        if (kind === 'move-text') {
          expect(parent.vC[8]).toMatchObject({ t: 'extra' })
        }
        expect(parent.vR).toHaveLength(kind === 'replace-all' ? size : 0)
        parent.vR.forEach((child, i) => expect(child).toBe(initial[i]))
        return reads
      }

      const small = measure(64)
      const large = measure(128)
      expect(small.old).toBeGreaterThan(0)
      expect(small.new).toBeGreaterThan(0)
      expect(large.old).toBeLessThan(small.old * 3)
      expect(large.old + large.new).toBeLessThan((small.old + small.new) * 3)
    })

    it.each(['unkeyed-to-text', 'undefined-tag-to-text', 'text-to-unkeyed'])(
      'replaces incompatible children after indexing: %s',
      (kind) => {
        const ids = Array.from({ length: 40 }, (_, i) => i)
        const createRow = (id: number) => <div key={id}>{id}</div>
        let footer: Child = kind === 'text-to-unkeyed' ? 'original' : <span>footer</span>
        if (kind === 'undefined-tag-to-text') {
          // @ts-expect-error An undefined component still creates a NodeObject at runtime.
          footer = createElementForDom(undefined, {})
        }
        const parent = buildNode(<section>{[...ids.map(createRow), footer]}</section>) as NodeObject
        build([], parent)
        const initial = parent.vC
        const next = [...ids].reverse()
        const after: Child[] = next.map(createRow)
        // Consume an indexed child before replacing the incompatible footer.
        after.splice(4, 0, kind === 'text-to-unkeyed' ? <span>updated</span> : 'updated')
        parent.props.children = after

        build([], parent)

        expect(parent.vC).toHaveLength(ids.length + 1)
        next.forEach((id, i) => expect(parent.vC[i < 4 ? i : i + 1]).toBe(initial[id]))
        expect(initial.includes(parent.vC[4])).toBe(false)
        expect(parent.vC[4]).toMatchObject(
          kind === 'text-to-unkeyed' ? { tag: 'span' } : { t: 'updated', d: true }
        )
        expect(parent.vR).toHaveLength(1)
        expect(parent.vR[0]).toBe(initial[ids.length])
      }
    )

    it('restores previous children with indexed matching and ordered removals', () => {
      const ids = Array.from({ length: 40 }, (_, i) => i)
      const createRow = (id: number) => <div key={id}>{id}</div>
      const parent = buildNode(<section>{ids.map(createRow)}</section>) as NodeObject
      build([], parent)
      const initial = parent.vC
      let keyReads = 0
      initial.forEach((child, id) => {
        Object.defineProperty(child, 'key', {
          configurable: true,
          get: () => {
            keyReads++
            return id
          },
        })
      })

      // Explicit fallback children preserve the original list in pC.
      build([], parent, [<span>Loading</span>])
      const fallback = parent.vC
      expect(parent.pC).toBe(initial)
      const next = [...ids].reverse().filter((id) => id !== 10 && id !== 20)
      parent.props.children = next.map(createRow)
      keyReads = 0
      build([], parent)
      const matchingReads = keyReads

      expect(matchingReads).toBeGreaterThan(0)
      expect(matchingReads).toBeLessThan(ids.length * 8)
      expect(parent.vC).toHaveLength(next.length)
      next.forEach((id, i) => expect(parent.vC[i]).toBe(initial[id]))
      const removed = [...fallback, initial[10], initial[20]]
      expect(parent.vR).toHaveLength(removed.length)
      removed.forEach((child, i) => expect(parent.vR[i]).toBe(child))
      expect(parent.pC).toBeUndefined()
    })

    it.each([
      { name: 'duplicate old keys', oldKeys: [0, 0], newKeys: [0, 0], matches: [0, 1] },
      { name: 'an unkeyed old child', oldKeys: [undefined, 1], newKeys: [undefined], matches: [0] },
      {
        name: 'multiple unkeyed old children',
        oldKeys: [undefined, undefined],
        newKeys: [undefined, undefined],
        matches: [0, 1],
      },
      { name: 'NaN keys', oldKeys: [NaN, 1], newKeys: [NaN, 1], matches: [-1, 1] },
      {
        name: 'a different tag for the same key',
        oldKeys: [0, 1],
        newKeys: [0, 0],
        firstNewTag: 'span',
        matches: [-1, 0],
      },
      { name: 'a repeated new key', oldKeys: [0, 1], newKeys: [0, 0], matches: [0, -1] },
      {
        name: 'different old tags sharing a key',
        oldKeys: [0, 0],
        oldSecondTag: 'span',
        newKeys: [0, 0],
        firstNewTag: 'span',
        matches: [1, 0],
      },
    ])(
      'preserves matching and removal order with $name',
      ({ oldKeys, newKeys, matches, oldSecondTag, firstNewTag }) => {
        const before = Array.from({ length: 40 }, (_, i) =>
          createElement(i === 1 ? oldSecondTag || 'div' : 'div', {
            key: i < oldKeys.length ? oldKeys[i] : i,
          })
        )
        const parent = buildNode(<section>{before}</section>) as NodeObject
        build([], parent)
        const initial = parent.vC
        // This prefix exceeds the scan budget and attempts to index the remaining nodes.
        const prefix = [39, 38, 37, 36]
        parent.props.children = [
          ...prefix.map((key) => <div key={key} />),
          ...newKeys.map((key, i) =>
            createElement(i === 0 ? firstNewTag || 'div' : 'div', { key })
          ),
        ]
        build([], parent)

        const expected = [...prefix, ...matches]
        expect(parent.vC).toHaveLength(expected.length)
        expected.forEach((oldIndex, i) => {
          if (oldIndex === -1) {
            expect(initial.includes(parent.vC[i])).toBe(false)
          } else {
            expect(parent.vC[i]).toBe(initial[oldIndex])
          }
        })
        const removed = initial.filter((_, i) => !expected.includes(i))
        expect(parent.vR).toHaveLength(removed.length)
        removed.forEach((child, i) => expect(parent.vR[i]).toBe(child))
      }
    )

    it.each(['keyed', 'unkeyed', 'text'])(
      'preserves state and cleanup order after indexing followed by %s children',
      async (kind) => {
        let update: () => void = () => {}
        const cleaned: number[] = []
        const Row = ({ id }: { id: number }) => {
          const [initialId] = useState(id)
          const [count, setCount] = useState(0)
          useLayoutEffect(
            () => () => {
              cleaned.push(initialId)
            },
            []
          )
          return (
            <button onClick={() => setCount(count + 1)}>
              {id}:{initialId}:{count}
            </button>
          )
        }
        const before = Array.from({ length: 40 }, (_, i) => i)
        const after = [...before]
          .reverse()
          .filter((id) => id !== 10 && id !== 20 && (kind !== 'unkeyed' || id !== 0))
        // Consume an indexed child before introducing an unkeyed or text child.
        if (kind !== 'keyed') {
          after.splice(4, 0, kind === 'unkeyed' ? 100 : 101)
        }
        const App = () => {
          const [ids, setIds] = useState(before)
          update = () => setIds(after)
          return ids.map((id) =>
            id === 101 ? 'inserted' : <Row key={id === 100 ? undefined : id} id={id} />
          )
        }

        render(<App />, root)
        const initial = [...root.querySelectorAll('button')]
        initial[0].click()
        await Promise.resolve()
        update()
        await Promise.resolve()

        const rows = after.filter((id) => id !== 101)
        expect(root.children).toHaveLength(rows.length)
        rows.forEach((id, i) => {
          const oldId = id === 100 ? 0 : id
          expect(root.children[i]).toBe(initial[oldId])
          expect(root.children[i].textContent).toBe(`${id}:${oldId}:${oldId === 0 ? 1 : 0}`)
        })
        if (kind === 'text') {
          expect(root.childNodes[4].textContent).toBe('inserted')
        }
        expect(cleaned).toEqual([10, 20])
      }
    )
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

    it('ignores invalid attribute keys without interrupting updates', async () => {
      const invalidKey = '" onfocus="alert(1)'

      const App = () => {
        const [includeInvalid, setIncludeInvalid] = useState(true)
        return includeInvalid ? (
          <div id='safe' {...{ [invalidKey]: 'x' }} onClick={() => setIncludeInvalid(false)}>
            Hello
          </div>
        ) : (
          <div class='updated'>Hello</div>
        )
      }

      render(<App />, root)
      expect(root.innerHTML).toBe('<div id="safe">Hello</div>')

      root.querySelector('div')?.click()
      await Promise.resolve()

      expect(root.innerHTML).toBe('<div class="updated">Hello</div>')
    })

    it('rethrows unexpected errors while setting attributes', () => {
      const error = new Error('boom')
      const originalSetAttribute = dom.window.Element.prototype.setAttribute
      const setAttributeSpy = vi
        .spyOn(dom.window.Element.prototype, 'setAttribute')
        .mockImplementation(function (this: Element, key: string, value: string) {
          if (key === 'data-boom') {
            throw error
          }
          return originalSetAttribute.call(this, key, value)
        })

      try {
        expect(() => render(<div data-boom='x'>Hello</div>, root)).toThrow(error)
      } finally {
        setAttributeSpy.mockRestore()
      }
    })

    it('rethrows unexpected errors while removing attributes', () => {
      render(<div data-boom='x'>Hello</div>, root)

      const error = new Error('boom')
      const originalRemoveAttribute = dom.window.Element.prototype.removeAttribute
      const removeAttributeSpy = vi
        .spyOn(dom.window.Element.prototype, 'removeAttribute')
        .mockImplementation(function (this: Element, key: string) {
          if (key === 'data-boom') {
            throw error
          }
          return originalRemoveAttribute.call(this, key)
        })

      try {
        expect(() => render(<div data-boom={undefined}>Hello</div>, root)).toThrow(error)
      } finally {
        removeAttributeSpy.mockRestore()
      }
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

    it('ref cleanup on ref prop change', async () => {
      const cleanup1 = vi.fn()
      const ref1 = vi.fn().mockReturnValue(cleanup1)
      const cleanup2 = vi.fn()
      const ref2 = vi.fn().mockReturnValue(cleanup2)

      const App = () => {
        const [currentRef, setCurrentRef] = useState(() => ref1)
        return (
          <>
            <div ref={currentRef} />
            <button onClick={() => setCurrentRef(() => ref2)}>switch</button>
          </>
        )
      }
      render(<App />, root)
      expect(ref1).toHaveBeenCalledTimes(1)
      expect(ref1).toHaveBeenLastCalledWith(expect.any(dom.window.HTMLDivElement))
      expect(cleanup1).toHaveBeenCalledTimes(0)
      expect(ref2).toHaveBeenCalledTimes(0)

      root.querySelector('button')?.click()
      await Promise.resolve()

      expect(cleanup1).toHaveBeenCalledTimes(1)
      expect(ref2).toHaveBeenCalledTimes(1)
      expect(ref2).toHaveBeenLastCalledWith(expect.any(dom.window.HTMLDivElement))
      expect(cleanup2).toHaveBeenCalledTimes(0)
    })

    it('does not call ref cleanup when ref reference does not change on re-render', async () => {
      const cleanup = vi.fn()
      const ref = vi.fn().mockReturnValue(cleanup)

      const App = () => {
        const [count, setCount] = useState(0)
        return (
          <>
            <div ref={ref} />
            <button onClick={() => setCount(count + 1)}>rerender</button>
          </>
        )
      }

      render(<App />, root)
      expect(ref).toHaveBeenCalledTimes(1)
      expect(cleanup).toHaveBeenCalledTimes(0)

      root.querySelector('button')?.click()
      await Promise.resolve()

      expect(ref).toHaveBeenCalledTimes(1)
      expect(cleanup).toHaveBeenCalledTimes(0)
    })

    it('ref cleanup on ref prop removal', async () => {
      const cleanup = vi.fn()
      const ref = vi.fn().mockReturnValue(cleanup)

      const App = () => {
        const [hasRef, setHasRef] = useState(true)
        return (
          <>
            <div {...(hasRef ? { ref } : {})} />
            <button onClick={() => setHasRef(false)}>remove</button>
          </>
        )
      }

      render(<App />, root)
      expect(ref).toHaveBeenCalledTimes(1)
      expect(cleanup).toHaveBeenCalledTimes(0)

      root.querySelector('button')?.click()
      await Promise.resolve()

      expect(cleanup).toHaveBeenCalledTimes(1)
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

    it('returning an array', async () => {
      const App = () => {
        const [count, setCount] = useState(0)
        return [<div>{count}</div>, <button onClick={() => setCount(count + 1)}>+</button>]
      }
      render(<App />, root)
      expect(root.innerHTML).toBe('<div>0</div><button>+</button>')
      root.querySelector('button')?.click()
      await Promise.resolve()
      expect(root.innerHTML).toBe('<div>1</div><button>+</button>')
    })

    it('typed as FC returning an array', async () => {
      const App: FC = () => {
        const [count, setCount] = useState(0)
        return [<div>{count}</div>, <button onClick={() => setCount(count + 1)}>+</button>]
      }
      render(<App />, root)
      expect(root.innerHTML).toBe('<div>0</div><button>+</button>')
      root.querySelector('button')?.click()
      await Promise.resolve()
      expect(root.innerHTML).toBe('<div>1</div><button>+</button>')
    })

    it('multiple children', async () => {
      const Child = ({ name }: { name: string }) => {
        const [count, setCount] = useState(0)
        return (
          <div>
            <div>
              {name} {count}
            </div>
            <button onClick={() => setCount(count + 1)}>+</button>
          </div>
        )
      }
      const App = () => {
        const [count, setCount] = useState(0)
        return (
          <div>
            <div>parent {count}</div>
            <button onClick={() => setCount(count + 1)}>+</button>
            <div>
              <Child name='child 1' />
              <Child name='child 2' />
              <Child name='child 3' />
            </div>
          </div>
        )
      }
      render(<App />, root)
      expect(root.innerHTML).toBe(
        '<div><div>parent 0</div><button>+</button><div><div><div>child 1 0</div><button>+</button></div><div><div>child 2 0</div><button>+</button></div><div><div>child 3 0</div><button>+</button></div></div></div>'
      )
      const [parentButton, child1Button, child2Button, child3Button] =
        root.querySelectorAll('button')
      parentButton?.click()
      await Promise.resolve()
      expect(root.innerHTML).toBe(
        '<div><div>parent 1</div><button>+</button><div><div><div>child 1 0</div><button>+</button></div><div><div>child 2 0</div><button>+</button></div><div><div>child 3 0</div><button>+</button></div></div></div>'
      )
      child2Button?.click()
      await Promise.resolve()
      expect(root.innerHTML).toBe(
        '<div><div>parent 1</div><button>+</button><div><div><div>child 1 0</div><button>+</button></div><div><div>child 2 1</div><button>+</button></div><div><div>child 3 0</div><button>+</button></div></div></div>'
      )
      child1Button?.click()
      await Promise.resolve()
      expect(root.innerHTML).toBe(
        '<div><div>parent 1</div><button>+</button><div><div><div>child 1 1</div><button>+</button></div><div><div>child 2 1</div><button>+</button></div><div><div>child 3 0</div><button>+</button></div></div></div>'
      )
      child3Button?.click()
      await Promise.resolve()
      expect(root.innerHTML).toBe(
        '<div><div>parent 1</div><button>+</button><div><div><div>child 1 1</div><button>+</button></div><div><div>child 2 1</div><button>+</button></div><div><div>child 3 1</div><button>+</button></div></div></div>'
      )
    })

    it('keeps sibling order when a null sibling exists after parent update', async () => {
      const Empty = () => null
      const Child = () => {
        const [count, setCount] = useState(0)
        return count === 0 ? (
          <>
            <div>A0</div>
            <button id='child' onClick={() => setCount(1)}>
              child+
            </button>
          </>
        ) : (
          <>
            <span>A1</span>
            <span>A2</span>
          </>
        )
      }
      const App = () => {
        const [count, setCount] = useState(0)
        return (
          <>
            <Child />
            <Empty />
            <div id='tail'>T{count}</div>
            <button id='parent' onClick={() => setCount(count + 1)}>
              parent+
            </button>
          </>
        )
      }
      render(<App />, root)
      expect(root.innerHTML).toBe(
        '<div>A0</div><button id="child">child+</button><div id="tail">T0</div><button id="parent">parent+</button>'
      )
      root.querySelector<HTMLButtonElement>('#parent')?.click()
      await Promise.resolve()
      expect(root.innerHTML).toBe(
        '<div>A0</div><button id="child">child+</button><div id="tail">T1</div><button id="parent">parent+</button>'
      )
      root.querySelector<HTMLButtonElement>('#child')?.click()
      await Promise.resolve()
      expect(root.innerHTML).toBe(
        '<span>A1</span><span>A2</span><div id="tail">T1</div><button id="parent">parent+</button>'
      )
    })

    it('multiple children with dynamic addition and rerender', async () => {
      const Child = ({ name }: { name: string }) => {
        const [count, setCount] = useState(0)
        return (
          <div>
            <div>
              {name} {count}
            </div>
            <button onClick={() => setCount(count + 1)}>+</button>
          </div>
        )
      }
      const App = () => {
        const [showThird, setShowThird] = useState(false)
        return (
          <div>
            <Child name='child 1' />
            <Child name='child 2' />
            {showThird && <Child name='child 3' />}
            <button onClick={() => setShowThird(true)}>add</button>
          </div>
        )
      }
      render(<App />, root)
      expect(root.innerHTML).toBe(
        '<div><div><div>child 1 0</div><button>+</button></div><div><div>child 2 0</div><button>+</button></div><button>add</button></div>'
      )
      // add child 3
      let buttons = root.querySelectorAll('button')
      buttons[2]?.click() // add
      await Promise.resolve()
      expect(root.innerHTML).toBe(
        '<div><div><div>child 1 0</div><button>+</button></div><div><div>child 2 0</div><button>+</button></div><div><div>child 3 0</div><button>+</button></div><button>add</button></div>'
      )
      // click child 1
      buttons = root.querySelectorAll('button')
      buttons[0]?.click() // child 1
      await Promise.resolve()
      expect(root.innerHTML).toBe(
        '<div><div><div>child 1 1</div><button>+</button></div><div><div>child 2 0</div><button>+</button></div><div><div>child 3 0</div><button>+</button></div><button>add</button></div>'
      )
      // click child 2 - verify child 2 and child 3 do not swap positions
      buttons = root.querySelectorAll('button')
      buttons[1]?.click() // child 2
      await Promise.resolve()
      expect(root.innerHTML).toBe(
        '<div><div><div>child 1 1</div><button>+</button></div><div><div>child 2 1</div><button>+</button></div><div><div>child 3 0</div><button>+</button></div><button>add</button></div>'
      )
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

    it('empty array and non-empty array', async () => {
      const App = () => (
        <div>
          {[]}
          {[<span>1</span>]}
        </div>
      )
      render(<App />, root)
      expect(root.innerHTML).toBe('<div><span>1</span></div>')
    })

    it('nested array', async () => {
      const nestedChildren: Child = [[[<span>1</span>], <span>2</span>]]
      const App = () => <div>{nestedChildren}</div>
      render(<App />, root)
      expect(root.innerHTML).toBe('<div><span>1</span><span>2</span></div>')
    })

    it('sparse array with nested child', async () => {
      const sparseChildren: Child[] = []
      sparseChildren[1] = [<span>1</span>]
      const App = () => <div>{sparseChildren}</div>
      render(<App />, root)
      expect(root.innerHTML).toBe('<div><span>1</span></div>')
    })

    it('toggle empty array and non-empty array on update', async () => {
      let setVisible: (value: boolean) => void = () => {}
      const App = () => {
        const [visible, _setVisible] = useState(false)
        setVisible = _setVisible
        return (
          <div>
            {visible ? [] : [<span key='a'>A</span>]}
            {visible ? [<span key='b'>B</span>] : []}
          </div>
        )
      }
      render(<App />, root)
      expect(root.innerHTML).toBe('<div><span>A</span></div>')

      setVisible(true)
      await Promise.resolve()
      expect(root.innerHTML).toBe('<div><span>B</span></div>')

      setVisible(false)
      await Promise.resolve()
      expect(root.innerHTML).toBe('<div><span>A</span></div>')
    })

    it('reshape nested array on update', async () => {
      let setPattern: (value: number) => void = () => {}
      const App = () => {
        const [pattern, _setPattern] = useState(0)
        setPattern = _setPattern
        const children: Child =
          pattern === 0
            ? [[<span key='a'>A</span>], <span key='b'>B</span>]
            : [<span key='a'>A</span>, [<span key='b'>B</span>]]
        return <div>{children}</div>
      }
      render(<App />, root)
      expect(root.innerHTML).toBe('<div><span>A</span><span>B</span></div>')

      setPattern(1)
      await Promise.resolve()
      expect(root.innerHTML).toBe('<div><span>A</span><span>B</span></div>')

      setPattern(0)
      await Promise.resolve()
      expect(root.innerHTML).toBe('<div><span>A</span><span>B</span></div>')
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
          const [value, _setValue] = useState<string | undefined>('b')
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
        expect(select.selectedIndex).toBe(0)
      })

      it('apply value after options are added', async () => {
        let setOptions: (options: string[]) => void = () => {}
        const App = () => {
          const [options, _setOptions] = useState<string[]>([])
          setOptions = _setOptions
          return (
            <select value='option2'>
              {options.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          )
        }
        render(<App />, root)
        setOptions(['option1', 'option2', 'option3'])
        await Promise.resolve()
        const select = root.querySelector('select') as HTMLSelectElement
        expect(select.value).toBe('option2')
        expect(select.selectedIndex).toBe(1)
        expect(select.options[1].selected).toBe(true)
      })

      it('select the first option when undefined after options are added', async () => {
        let setOptions: (options: string[]) => void = () => {}
        const App = () => {
          const [options, _setOptions] = useState<string[]>([])
          setOptions = _setOptions
          return (
            <select value={undefined}>
              {options.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          )
        }
        render(<App />, root)
        setOptions(['option1', 'option2', 'option3'])
        await Promise.resolve()
        const select = root.querySelector('select') as HTMLSelectElement
        expect(select.value).toBe('option1')
        expect(select.selectedIndex).toBe(0)
        expect(select.options[0].selected).toBe(true)
      })

      it('do not select the first option for invalid multiple value', () => {
        const App = () => {
          return (
            <select multiple value='z'>
              <option value='a'>A</option>
              <option value='b'>B</option>
              <option value='c'>C</option>
            </select>
          )
        }
        render(<App />, root)
        const select = root.querySelector('select') as HTMLSelectElement
        expect(select.value).toBe('')
        expect(select.selectedIndex).toBe(-1)
        expect([...select.options].every((option) => !option.selected)).toBe(true)
      })

      it('keep invalid multiple value unselected after options are added', async () => {
        let setOptions: (options: string[]) => void = () => {}
        const App = () => {
          const [options, _setOptions] = useState<string[]>([])
          setOptions = _setOptions
          return (
            <select multiple value='z'>
              {options.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          )
        }
        render(<App />, root)
        setOptions(['a', 'b', 'c'])
        await Promise.resolve()
        const select = root.querySelector('select') as HTMLSelectElement
        expect(select.value).toBe('')
        expect(select.selectedIndex).toBe(-1)
        expect([...select.options].every((option) => !option.selected)).toBe(true)
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

  it('reconciles large keyed list updates and reordering efficiently', async () => {
    let findIndexCalls = 0
    const originalFindIndex = Array.prototype.findIndex
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Array.prototype.findIndex = function (this: unknown[], ...args: [any]) {
      findIndexCalls++
      return originalFindIndex.apply(this, args)
    }

    try {
      const ListApp = () => {
        const [items, setItems] = useState(() => Array.from({ length: 100 }, (_, i) => `item-${i}`))
        return (
          <div>
            <ul>
              {items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <button id='reverse' onClick={() => setItems((prev) => [...prev].reverse())}>
              reverse
            </button>
            <button id='update' onClick={() => setItems((prev) => [...prev])}>
              update
            </button>
          </div>
        )
      }

      render(<ListApp />, root)
      expect(root.querySelectorAll('li')).toHaveLength(100)
      expect(root.querySelector('li')?.textContent).toBe('item-0')

      findIndexCalls = 0
      const updateBtn = root.querySelector('#update') as HTMLButtonElement
      updateBtn.click()
      await Promise.resolve()

      expect(findIndexCalls).toBe(0)
      expect(root.querySelectorAll('li')).toHaveLength(100)
      expect(root.querySelector('li')?.textContent).toBe('item-0')

      const reverseBtn = root.querySelector('#reverse') as HTMLButtonElement
      reverseBtn.click()
      await Promise.resolve()

      expect(root.querySelectorAll('li')).toHaveLength(100)
      expect(root.querySelector('li')?.textContent).toBe('item-99')
    } finally {
      Array.prototype.findIndex = originalFindIndex
    }
  })

  it('preserves keyed child identity and state when reordering', async () => {
    let reverse: () => void = () => {}
    const Row = ({ id }: { id: string }) => {
      const [count, setCount] = useState(0)
      return (
        <button data-id={id} onClick={() => setCount(count + 1)}>
          {id}:{count}
        </button>
      )
    }
    const App = () => {
      const [ids, setIds] = useState(['a', 'b', 'c'])
      reverse = () => setIds((ids) => [...ids].reverse())
      return ids.map((id) => <Row key={id} id={id} />)
    }

    render(<App />, root)
    const initialRows = Object.fromEntries(
      [...root.querySelectorAll<HTMLButtonElement>('button')].map((element) => [
        element.dataset.id,
        element,
      ])
    )

    initialRows.b.click()
    await Promise.resolve()
    reverse()
    await Promise.resolve()

    const reorderedRows = [...root.querySelectorAll<HTMLButtonElement>('button')]
    expect(reorderedRows.map((element) => element.textContent)).toEqual(['c:0', 'b:1', 'a:0'])
    expect(reorderedRows[0]).toBe(initialRows.c)
    expect(reorderedRows[1]).toBe(initialRows.b)
    expect(reorderedRows[2]).toBe(initialRows.a)
  })

  it('reuses duplicate keyed children in their previous order', async () => {
    let rotate: () => void = () => {}
    const Row = ({ label }: { label: string }) => {
      const [initialLabel] = useState(label)
      return <div>{`${label}:${initialLabel}`}</div>
    }
    const App = () => {
      const [labels, setLabels] = useState(['other', 'first', 'second'])
      rotate = () => setLabels(['first', 'second', 'other'])
      return labels.map((label) => (
        <Row key={label === 'other' ? 'other' : 'duplicate'} label={label} />
      ))
    }

    render(<App />, root)
    const initialRows = [...root.querySelectorAll('div')]
    rotate()
    await Promise.resolve()

    const reorderedRows = [...root.querySelectorAll('div')]
    expect(reorderedRows.map((element) => element.textContent)).toEqual([
      'first:first',
      'second:second',
      'other:other',
    ])
    expect(reorderedRows[0]).toBe(initialRows[1])
    expect(reorderedRows[1]).toBe(initialRows[2])
    expect(reorderedRows[2]).toBe(initialRows[0])
  })

  it.each([
    {
      consumedBy: 'an earlier keyed child',
      before: [2, 1, 5, 1],
      after: [9, 2, 1, 1],
      matches: [-1, 0, 1, 3],
      statefulIndex: 3,
      removedIndices: [2],
    },
    {
      consumedBy: 'an earlier unkeyed child',
      before: ['other', 1, 1, 1, 3],
      after: [1, undefined, 1, 1],
      matches: [1, 2, 3, -1],
      statefulIndex: 2,
      removedIndices: [0, 4],
    },
  ])(
    'does not reuse children already consumed by $consumedBy',
    async ({ before, after, matches, statefulIndex, removedIndices }) => {
      let reorder: () => void = () => {}
      const Other = () => <button>Other</button>
      const Row = () => {
        const [count, setCount] = useState(0)
        return <button onClick={() => setCount(count + 1)}>{count}</button>
      }
      const App = () => {
        const [keys, setKeys] = useState<Array<number | string | undefined>>(before)
        reorder = () => setKeys(after)
        return keys.map((key) => (key === 'other' ? <Other /> : <Row key={key} />))
      }

      render(<App />, root)
      const initialRows = [...root.querySelectorAll('button')]
      initialRows[statefulIndex].click()
      await Promise.resolve()
      reorder()
      await Promise.resolve()

      const reorderedRows = [...root.querySelectorAll('button')]
      expect(reorderedRows).toHaveLength(matches.length)
      matches.forEach((oldIndex, newIndex) => {
        if (oldIndex === -1) {
          expect(initialRows.includes(reorderedRows[newIndex])).toBe(false)
        } else {
          expect(reorderedRows[newIndex]).toBe(initialRows[oldIndex])
        }
        expect(reorderedRows[newIndex].textContent).toBe(oldIndex === statefulIndex ? '1' : '0')
      })
      removedIndices.forEach((index) => {
        expect(initialRows[index].isConnected).toBe(false)
      })
    }
  )

  it('preserves existing keyed children when prepending', async () => {
    let prepend: () => void = () => {}
    const App = () => {
      const [ids, setIds] = useState(['a', 'b'])
      prepend = () => setIds(['x', 'a', 'b'])
      return ids.map((id) => <div key={id}>{id}</div>)
    }

    render(<App />, root)
    const initialRows = [...root.querySelectorAll('div')]
    prepend()
    await Promise.resolve()

    const prependedRows = [...root.querySelectorAll('div')]
    expect(prependedRows.map((element) => element.textContent)).toEqual(['x', 'a', 'b'])
    expect(prependedRows[1]).toBe(initialRows[0])
    expect(prependedRows[2]).toBe(initialRows[1])
  })

  it('unmounts a keyed child removed from the middle', async () => {
    let removeMiddle: () => void = () => {}
    const cleanup = vi.fn()
    const ref = vi.fn().mockReturnValue(cleanup)
    const App = () => {
      const [ids, setIds] = useState(['a', 'b', 'c'])
      removeMiddle = () => setIds(['a', 'c'])
      return ids.map((id) => (
        <div key={id} ref={id === 'b' ? ref : undefined}>
          {id}
        </div>
      ))
    }

    render(<App />, root)
    const initialRows = [...root.querySelectorAll('div')]
    removeMiddle()
    await Promise.resolve()

    const remainingRows = [...root.querySelectorAll('div')]
    expect(remainingRows.map((element) => element.textContent)).toEqual(['a', 'c'])
    expect(remainingRows[0]).toBe(initialRows[0])
    expect(remainingRows[1]).toBe(initialRows[2])
    expect(initialRows[1].isConnected).toBe(false)
    expect(cleanup).toHaveBeenCalledOnce()
  })

  it('cleans up removed keyed children in their previous order', async () => {
    let remove: () => void = () => {}
    const cleanedUp: string[] = []
    const Row = ({ id }: { id: string }) => {
      useLayoutEffect(
        () => () => {
          cleanedUp.push(id)
        },
        []
      )
      return <div>{id}</div>
    }
    const App = () => {
      const [ids, setIds] = useState(['a', 'b', 'c', 'd'])
      remove = () => setIds(['b'])
      return ids.map((id) => <Row key={id} id={id} />)
    }

    render(<App />, root)
    const initialRows = [...root.children]
    remove()
    await Promise.resolve()

    expect(root.children).toHaveLength(1)
    expect(root.firstElementChild).toBe(initialRows[1])
    expect(cleanedUp).toEqual(['a', 'c', 'd'])
    expect(initialRows.filter((row) => row.isConnected)).toHaveLength(1)
  })

  it('allows an unkeyed child to reuse a keyed child with the same tag', async () => {
    let removeKeyedSiblings: () => void = () => {}
    const Row = ({ label }: { label: string }) => {
      const [initialLabel] = useState(label)
      return <div>{`${label}:${initialLabel}`}</div>
    }
    const App = () => {
      const [showSingle, setShowSingle] = useState(false)
      removeKeyedSiblings = () => setShowSingle(true)
      return showSingle ? (
        <Row label='replacement' />
      ) : (
        [<Row key='keyed' label='keyed' />, <Row label='unkeyed' />]
      )
    }

    render(<App />, root)
    const initialRows = [...root.querySelectorAll('div')]
    removeKeyedSiblings()
    await Promise.resolve()

    const replacement = root.querySelector('div') as HTMLDivElement
    expect(replacement.textContent).toBe('replacement:keyed')
    expect(replacement).toBe(initialRows[0])
    expect(initialRows[1].isConnected).toBe(false)
  })

  it('preserves unkeyed elements and text when removing a leading sibling', async () => {
    let hideHeading: () => void = () => {}
    const App = () => {
      const [showHeading, setShowHeading] = useState(true)
      hideHeading = () => setShowHeading(false)
      return [
        showHeading && <h2>Heading</h2>,
        <p>First paragraph</p>,
        'First text',
        <span>First span</span>,
        <p>Second paragraph</p>,
        'Second text',
        <span>Second span</span>,
      ]
    }

    render(<App />, root)
    const initialNodes = [...root.childNodes]
    hideHeading()
    await Promise.resolve()

    expect(root.childNodes).toHaveLength(initialNodes.length - 1)
    initialNodes.slice(1).forEach((node, i) => {
      expect(root.childNodes[i]).toBe(node)
    })
    expect(initialNodes[0].isConnected).toBe(false)
  })

  it('resumes unkeyed matching after a keyed sibling consumes the next candidate', async () => {
    let reorder: () => void = () => {}
    const App = () => {
      const [updated, setUpdated] = useState(false)
      reorder = () => setUpdated(true)
      return updated
        ? [<p>A</p>, <p key='b'>B</p>, <p>C</p>, <p>D</p>, <span>X</span>, <span>Y</span>]
        : [<h2>Heading</h2>, <p key='a'>A</p>, <p key='b'>B</p>, <p>C</p>]
    }

    render(<App />, root)
    const initialNodes = [...root.children]
    reorder()
    await Promise.resolve()

    expect(root.innerHTML).toBe('<p>A</p><p>B</p><p>C</p><p>D</p><span>X</span><span>Y</span>')
    initialNodes.slice(1).forEach((node, i) => {
      expect(root.children[i]).toBe(node)
    })
    expect(initialNodes[0].isConnected).toBe(false)
  })

  it('does not reuse children with NaN keys', async () => {
    let rerender: () => void = () => {}
    const App = () => {
      const [count, setCount] = useState(0)
      rerender = () => setCount((count) => count + 1)
      return <div key={Number.NaN}>{count}</div>
    }

    render(<App />, root)
    const initialChild = root.firstElementChild
    rerender()
    await Promise.resolve()

    expect(root.textContent).toBe('1')
    expect(root.firstElementChild).not.toBe(initialChild)
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

    it('should not return memoized result when context is not changed', async () => {
      const Context = createContext<[number, (arg: number | ((value: number) => number)) => void]>([
        0,
        () => {},
      ])
      const Container: FC<{ children: Child }> = ({ children }) => {
        const [count, setCount] = useState(0)
        return <Context.Provider value={[count, setCount]}>{children}</Context.Provider>
      }
      const Content = () => {
        const [count, setCount] = useContext(Context)
        return (
          <>
            <span>{count}</span>
            <button onClick={() => setCount((c) => c + 1)}>+</button>
          </>
        )
      }
      const app = (
        <Container>
          <Content />
        </Container>
      )
      render(app, root)
      expect(root.innerHTML).toBe('<span>0</span><button>+</button>')
      root.querySelector('button')?.click()
      await Promise.resolve()
      expect(root.innerHTML).toBe('<span>1</span><button>+</button>')
    })
  })

  describe('useRef', async () => {
    it('types: non-null initial value returns RefObject<T>', () => {
      const ref = useRef(new Map<string, number>())
      // .current is non-nullable; this line would not type-check without the overload
      ref.current.set('a', 1)
      expect(ref.current.get('a')).toBe(1)
    })

    it('types: null initial value returns RefObject<T | null>', () => {
      const ref = useRef<HTMLDivElement>(null)
      expect(ref.current).toBeNull()
    })

    it('types: undefined initial value returns RefObject<T | undefined>', () => {
      const ref = useRef<number>(undefined)
      expect(ref.current).toBeUndefined()
      ref.current = 1
      expect(ref.current).toBe(1)
    })

    it('simple', async () => {
      const Input = ({
        label,
        ref,
      }: {
        label: string
        ref: RefObject<HTMLInputElement | null>
      }) => {
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
      const Child = ({ parent }: { parent: RefObject<HTMLElement | null> }) => {
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
      const Child = ({ parent }: { parent: RefObject<HTMLElement | null> }) => {
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
      const Child = ({ parent }: { parent: RefObject<HTMLElement | null> }) => {
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

    it('skips invalid attribute keys in SVG while preserving valid ones', () => {
      const App = () => {
        return (
          <svg>
            <g {...{ ['" onload="alert(1)']: 'x', viewBox: '0 0 10 10' }} />
          </svg>
        )
      }
      render(<App />, root)
      expect(root.innerHTML).toBe('<svg><g viewBox="0 0 10 10"></g></svg>')
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
