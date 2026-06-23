import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const importIndex = () =>
  // @ts-expect-error es6 module target disallows dynamic import
  import('./index')
const importStreaming = () =>
  // @ts-expect-error es6 module target disallows dynamic import
  import('./streaming')
const importHooks = () =>
  // @ts-expect-error es6 module target disallows dynamic import
  import('./hooks')
const importAsyncHooks = () =>
  // @ts-expect-error es6 module target disallows dynamic import
  import('node:async_hooks')

/**
 * These tests exercise the non-`AsyncLocalStorage` fallback path. They force
 * every `AsyncLocalStorage` acquisition route to fail (and keep it disabled
 * while the module lazily probes for it), then verify the React-style
 * fail-safe: reading context after `await` returns the default value and never
 * another concurrent request's value.
 */
describe('JSX context isolation without AsyncLocalStorage', () => {
  let originalGetBuiltinModule: unknown
  let originalMainModule: unknown
  let warnSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    // Disable every route `loadAsyncLocalStorage()` tries. These stay in effect
    // through the first render so the lazy probe caches "unavailable".
    vi.resetModules()
    originalGetBuiltinModule = (process as { getBuiltinModule?: unknown }).getBuiltinModule
    ;(process as { getBuiltinModule?: unknown }).getBuiltinModule = undefined
    originalMainModule = (process as { mainModule?: unknown }).mainModule
    ;(process as { mainModule?: unknown }).mainModule = undefined
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    ;(process as { getBuiltinModule?: unknown }).getBuiltinModule = originalGetBuiltinModule
    ;(process as { mainModule?: unknown }).mainModule = originalMainModule
    vi.unstubAllGlobals()
    vi.resetModules()
    warnSpy.mockRestore()
  })

  it('falls back to the default value after await and never leaks across concurrent renders', async () => {
    const { createContext, useContext, jsx } = await importIndex()

    const SessionContext = createContext<{ username: string; role: string }>({
      username: 'nobody',
      role: 'none',
    })

    const waits = new Map<string, Promise<void>>()
    const entered = new Map<string, () => void>()

    const AdminDashboard = async () => {
      const initialSession = useContext(SessionContext)
      entered.get(initialSession.username)?.()
      await waits.get(initialSession.username)
      const session = useContext(SessionContext)
      if (session.role !== 'admin') {
        return jsx('div', {}, `Access Denied for ${session.username}`)
      }
      return jsx('div', {}, `Welcome Admin ${session.username}. Secret Data: 42`)
    }

    const render = async (username: string, role: string): Promise<string> =>
      `${await jsx(
        SessionContext.Provider,
        { value: { username, role } },
        jsx(AdminDashboard, {})
      ).toString()}`

    let resolveAdmin!: () => void
    let resolveAttacker!: () => void
    waits.set(
      'admin',
      new Promise<void>((resolve) => {
        resolveAdmin = resolve
      })
    )
    waits.set(
      'attacker',
      new Promise<void>((resolve) => {
        resolveAttacker = resolve
      })
    )
    const adminEntered = new Promise<void>((resolve) => {
      entered.set('admin', resolve)
    })
    const attackerEntered = new Promise<void>((resolve) => {
      entered.set('attacker', resolve)
    })

    const adminReq = render('admin', 'admin')
    const attackerReq = render('attacker', 'guest')

    await Promise.all([adminEntered, attackerEntered])
    resolveAttacker()
    await Promise.resolve()
    resolveAdmin()

    const [adminHtml, attackerHtml] = await Promise.all([adminReq, attackerReq])

    // Without AsyncLocalStorage the post-await read sees the default value —
    // the same fail-safe React's request storage degrades to. The critical
    // guarantee is that neither render observes the other request's value.
    expect(adminHtml).toBe('<div>Access Denied for nobody</div>')
    expect(attackerHtml).toBe('<div>Access Denied for nobody</div>')
  })

  it('warns once when a post-await read falls back to the default value', async () => {
    const { createContext, useContext, jsx } = await importIndex()

    const ThemeContext = createContext('default')
    const Reader = async () => {
      await new Promise((r) => setTimeout(r, 10))
      return jsx('div', {}, useContext(ThemeContext))
    }
    const render = async () =>
      `${await jsx(ThemeContext.Provider, { value: 'provided' }, jsx(Reader, {})).toString()}`

    expect(await render()).toBe('<div>default</div>')
    expect(await render()).toBe('<div>default</div>')

    // Degrading to the default value is reported once, not per read.
    expect(warnSpy).toHaveBeenCalledTimes(1)
    expect(warnSpy.mock.calls[0][0]).toContain('AsyncLocalStorage')
  })

  it('clears the fallback warning window after an async render rejects', async () => {
    const { createContext, useContext, jsx } = await importIndex()

    const ThemeContext = createContext('default')
    const Broken = async () => {
      await Promise.resolve()
      throw new Error('boom')
    }

    await expect(jsx(Broken, {}).toString()).rejects.toThrow('boom')

    useContext(ThemeContext)
    expect(warnSpy).not.toHaveBeenCalled()
  })

  it('finds AsyncLocalStorage via process.mainModule.require (Node < 20.16 CJS)', async () => {
    // Re-enable only the legacy route: a CJS entrypoint exposes the main
    // module's `require` even where `process.getBuiltinModule` doesn't exist.
    // Context must then survive `await` with no warning.
    const { AsyncLocalStorage } = await importAsyncHooks()
    ;(process as { mainModule?: unknown }).mainModule = {
      require: (specifier: string) =>
        specifier === 'node:async_hooks' ? { AsyncLocalStorage } : {},
    }

    const { createContext, useContext, jsx } = await importIndex()

    const ThemeContext = createContext('default')
    const Reader = async () => {
      await new Promise((r) => setTimeout(r, 10))
      return jsx('div', {}, useContext(ThemeContext))
    }

    expect(
      `${await jsx(ThemeContext.Provider, { value: 'provided' }, jsx(Reader, {})).toString()}`
    ).toBe('<div>provided</div>')
    expect(warnSpy).not.toHaveBeenCalled()
  })

  it('keeps a synchronous render synchronous and does not warn', async () => {
    const { createContext, useContext, jsx } = await importIndex()

    const ThemeContext = createContext('light')
    const Consumer = () => jsx('span', {}, useContext(ThemeContext))

    const result = jsx(ThemeContext.Provider, { value: 'dark' }, jsx(Consumer, {})).toString()

    // A purely synchronous render must not be forced async by the serializer.
    expect(result).toBe('<span>dark</span>')
    expect(warnSpy).not.toHaveBeenCalled()
  })

  const drainStream = async (stream: unknown): Promise<string> => {
    const textDecoder = new TextDecoder()
    let html = ''
    for await (const chunk of stream as AsyncIterable<Uint8Array>) {
      html += textDecoder.decode(chunk)
    }
    return html
  }

  it('restores provider values for the subtree returned by a resumed async component', async () => {
    const { createContext, useContext, jsx } = await importIndex()

    const ThemeContext = createContext('default')
    const Inner = () => jsx('span', {}, useContext(ThemeContext))
    const Outer = async () => {
      await new Promise((r) => setTimeout(r, 10))
      // Unlike a useContext() call here in the async body (which degrades to
      // the default), the returned subtree renders with the context values
      // snapshotted at suspension and restored by the renderer.
      return jsx(Inner, {})
    }

    expect(
      `${await jsx(ThemeContext.Provider, { value: 'provided' }, jsx(Outer, {})).toString()}`
    ).toBe('<span>provided</span>')
    expect(warnSpy).not.toHaveBeenCalled()
  })

  it('resumes a Suspense-deferred subtree in the captured request store', async () => {
    const { createContext, useContext, jsx } = await importIndex()
    const { Suspense, renderToReadableStream } = await importStreaming()
    const { use } = await importHooks()

    // A `use()`-suspended child takes the deferred re-render path, which on the
    // fallback path re-establishes the captured render store synchronously.
    const deferred = new Promise<string>((resolve) => setTimeout(() => resolve('done'), 10))
    const ThemeContext = createContext('default')
    const Inner = () => jsx('span', {}, useContext(ThemeContext))
    const Content = () => {
      const value = use(deferred)
      return jsx(ThemeContext.Provider, { value }, jsx(Inner, {}))
    }

    const html = await drainStream(
      renderToReadableStream(jsx(Suspense, { fallback: jsx('p', {}, 'Loading') }, jsx(Content, {})))
    )

    expect(html).toContain('Loading')
    expect(html).toContain('<span>done</span>')
    // Providers inside the resumed subtree render in the request store, not in
    // the module-global fallback — so no degradation warning fires.
    expect(warnSpy).not.toHaveBeenCalled()
  })

  it('resumes a Suspense-deferred subtree with outer provider values', async () => {
    const { createContext, useContext, jsx } = await importIndex()
    const { Suspense, renderToReadableStream } = await importStreaming()
    const { use } = await importHooks()

    const deferred = new Promise<string>((resolve) => setTimeout(() => resolve('done'), 10))
    const ThemeContext = createContext('default')
    const Content = () => {
      use(deferred)
      return jsx('span', {}, useContext(ThemeContext))
    }

    const html = await drainStream(
      renderToReadableStream(
        jsx(
          ThemeContext.Provider,
          { value: 'outer' },
          jsx(Suspense, { fallback: jsx('p', {}, 'Loading') }, jsx(Content, {}))
        )
      )
    )

    expect(html).toContain('Loading')
    expect(html).toContain('<span>outer</span>')
    expect(html).not.toContain('<span>default</span>')
    expect(warnSpy).not.toHaveBeenCalled()
  })

  it('renders Suspense fallback with outer provider values', async () => {
    const { createContext, useContext, jsx } = await importIndex()
    const { Suspense, renderToReadableStream } = await importStreaming()
    const { use } = await importHooks()

    const deferred = new Promise<string>((resolve) => setTimeout(() => resolve('done'), 10))
    const ThemeContext = createContext('default')
    const Fallback = () => jsx('p', {}, `Loading ${useContext(ThemeContext)}`)
    const Content = () => {
      const value = use(deferred)
      return jsx('span', {}, value)
    }

    const html = await drainStream(
      renderToReadableStream(
        jsx(
          ThemeContext.Provider,
          { value: 'outer' },
          jsx(Suspense, { fallback: jsx(Fallback, {}) }, jsx(Content, {}))
        )
      )
    )

    expect(html).toContain('<p>Loading outer</p>')
    expect(html).toContain('<span>done</span>')
    expect(html).not.toContain('default')
    expect(warnSpy).not.toHaveBeenCalled()
  })

  it('restores nested provider values in a resumed Suspense subtree', async () => {
    const { createContext, useContext, jsx, Fragment } = await importIndex()
    const { Suspense, renderToReadableStream } = await importStreaming()
    const { use } = await importHooks()

    const deferred = new Promise<string>((resolve) => setTimeout(() => resolve('done'), 10))
    const ThemeContext = createContext('default')
    const Inner = () => jsx('span', {}, useContext(ThemeContext))
    const OuterSibling = () => jsx('em', {}, useContext(ThemeContext))
    const Content = () => {
      use(deferred)
      return jsx(
        Fragment,
        {},
        jsx(ThemeContext.Provider, { value: 'inner' }, jsx(Inner, {})),
        jsx(OuterSibling, {})
      )
    }

    const html = await drainStream(
      renderToReadableStream(
        jsx(
          ThemeContext.Provider,
          { value: 'outer' },
          jsx(Suspense, { fallback: jsx('p', {}, 'Loading') }, jsx(Content, {}))
        )
      )
    )

    expect(html).toContain('<span>inner</span><em>outer</em>')
    expect(html).not.toContain('default')
    expect(warnSpy).not.toHaveBeenCalled()
  })

  it('keeps sibling Suspense resume contexts isolated when they resolve out of order', async () => {
    const { createContext, useContext, jsx, Fragment } = await importIndex()
    const { Suspense, renderToReadableStream } = await importStreaming()
    const { use } = await importHooks()

    const ThemeContext = createContext('default')
    const waits = new Map<string, Promise<void>>()
    const entered = new Map<string, () => void>()
    let resolveFirst!: () => void
    let resolveSecond!: () => void
    waits.set(
      'first',
      new Promise<void>((resolve) => {
        resolveFirst = resolve
      })
    )
    waits.set(
      'second',
      new Promise<void>((resolve) => {
        resolveSecond = resolve
      })
    )
    const firstEntered = new Promise<void>((resolve) => {
      entered.set('first', resolve)
    })
    const secondEntered = new Promise<void>((resolve) => {
      entered.set('second', resolve)
    })
    const Content = ({ name }: { name: string }) => {
      entered.get(name)?.()
      use(waits.get(name)!)
      return jsx('span', {}, `${name}:${useContext(ThemeContext)}`)
    }

    const htmlPromise = drainStream(
      renderToReadableStream(
        jsx(
          Fragment,
          {},
          jsx(
            ThemeContext.Provider,
            { value: 'one' },
            jsx(
              Suspense,
              { fallback: jsx('p', {}, 'Loading one') },
              jsx(Content, { name: 'first' })
            )
          ),
          jsx(
            ThemeContext.Provider,
            { value: 'two' },
            jsx(
              Suspense,
              { fallback: jsx('p', {}, 'Loading two') },
              jsx(Content, { name: 'second' })
            )
          )
        )
      )
    )

    await Promise.all([firstEntered, secondEntered])
    resolveSecond()
    await Promise.resolve()
    resolveFirst()

    const html = await htmlPromise

    expect(html).toContain('<span>first:one</span>')
    expect(html).toContain('<span>second:two</span>')
    expect(html).not.toContain('default')
    expect(warnSpy).not.toHaveBeenCalled()
  })

  it('resumes ErrorBoundary-deferred children in the captured request store', async () => {
    const { createContext, useContext, jsx, ErrorBoundary } = await importIndex()
    const { renderToReadableStream } = await importStreaming()

    const deferred = new Promise<string>((resolve) => setTimeout(() => resolve('done'), 10))
    let resolved: string | undefined
    deferred.then((value) => {
      resolved = value
    })
    const ThemeContext = createContext('default')
    const Inner = () => jsx('span', {}, useContext(ThemeContext))
    const Content = () => {
      if (!resolved) {
        // Suspend like use() does so ErrorBoundary defers the re-render.
        throw deferred
      }
      return jsx(ThemeContext.Provider, { value: resolved }, jsx(Inner, {}))
    }

    const html = await drainStream(
      renderToReadableStream(
        jsx(ErrorBoundary, { fallback: jsx('p', {}, 'Failed') }, jsx(Content, {}))
      )
    )

    expect(html).toContain('<span>done</span>')
    expect(warnSpy).not.toHaveBeenCalled()
  })

  it('resumes ErrorBoundary-deferred children with outer provider values', async () => {
    const { createContext, useContext, jsx, ErrorBoundary } = await importIndex()
    const { renderToReadableStream } = await importStreaming()

    const deferred = new Promise<string>((resolve) => setTimeout(() => resolve('done'), 10))
    let resolved: string | undefined
    deferred.then((value) => {
      resolved = value
    })
    const ThemeContext = createContext('default')
    const Content = () => {
      if (!resolved) {
        // Suspend like use() does so ErrorBoundary defers the re-render.
        throw deferred
      }
      return jsx('span', {}, useContext(ThemeContext))
    }

    const html = await drainStream(
      renderToReadableStream(
        jsx(
          ThemeContext.Provider,
          { value: 'outer' },
          jsx(ErrorBoundary, { fallback: jsx('p', {}, 'Failed') }, jsx(Content, {}))
        )
      )
    )

    expect(html).toContain('<span>outer</span>')
    expect(html).not.toContain('<span>default</span>')
    expect(warnSpy).not.toHaveBeenCalled()
  })

  it('resumes ErrorBoundary fallback rendering with outer provider values', async () => {
    const { createContext, useContext, jsx, ErrorBoundary } = await importIndex()
    const { renderToReadableStream } = await importStreaming()

    const deferred = new Promise((_resolve, reject) =>
      setTimeout(() => reject(new Error('boom')), 10)
    )
    const ThemeContext = createContext('default')
    const Content = () => {
      throw deferred
    }

    const html = await drainStream(
      renderToReadableStream(
        jsx(
          ThemeContext.Provider,
          { value: 'outer' },
          jsx(
            ErrorBoundary,
            {
              fallbackRender: (error: Error) =>
                jsx('span', {}, `fallback:${useContext(ThemeContext)}:${error.message}`),
            },
            jsx(Content, {})
          )
        )
      )
    )

    expect(html).toContain('<span>fallback:outer:boom</span>')
    expect(html).not.toContain('fallback:default')
    expect(warnSpy).not.toHaveBeenCalled()
  })

  it('resumes ErrorBoundary fallbackRender components with outer provider values', async () => {
    const { createContext, useContext, jsx, ErrorBoundary } = await importIndex()
    const { renderToReadableStream } = await importStreaming()

    const deferred = new Promise((_resolve, reject) =>
      setTimeout(() => reject(new Error('boom')), 10)
    )
    const ThemeContext = createContext('default')
    const Content = () => {
      throw deferred
    }
    const Fallback = () => jsx('span', {}, `fallback:${useContext(ThemeContext)}`)

    const html = await drainStream(
      renderToReadableStream(
        jsx(
          ThemeContext.Provider,
          { value: 'outer' },
          jsx(
            ErrorBoundary,
            {
              fallbackRender: () => jsx(Fallback, {}),
            },
            jsx(Content, {})
          )
        )
      )
    )

    expect(html).toContain('<span>fallback:outer</span>')
    expect(html).not.toContain('fallback:default')
    expect(warnSpy).not.toHaveBeenCalled()
  })

  it('resumes ErrorBoundary fallback prop rendering with outer provider values', async () => {
    const { createContext, useContext, jsx, ErrorBoundary } = await importIndex()
    const { renderToReadableStream } = await importStreaming()

    const deferred = new Promise((_resolve, reject) =>
      setTimeout(() => reject(new Error('boom')), 10)
    )
    const ThemeContext = createContext('default')
    const Content = () => {
      throw deferred
    }
    const Fallback = () => jsx('span', {}, `fallback:${useContext(ThemeContext)}`)

    const html = await drainStream(
      renderToReadableStream(
        jsx(
          ThemeContext.Provider,
          { value: 'outer' },
          jsx(ErrorBoundary, { fallback: jsx(Fallback, {}) }, jsx(Content, {}))
        )
      )
    )

    expect(html).toContain('<span>fallback:outer</span>')
    expect(html).not.toContain('fallback:default')
    expect(warnSpy).not.toHaveBeenCalled()
  })

  it('resumes thenable ErrorBoundary fallback prop rendering with outer provider values', async () => {
    const { createContext, useContext, jsx, ErrorBoundary } = await importIndex()
    const { renderToReadableStream } = await importStreaming()

    const deferred = new Promise((_resolve, reject) =>
      setTimeout(() => reject(new Error('boom')), 10)
    )
    const ThemeContext = createContext('default')
    const Content = () => {
      throw deferred
    }
    const Fallback = () => jsx('span', {}, `fallback:${useContext(ThemeContext)}`)
    const fallback = {
      then(resolve: (value: unknown) => void) {
        setTimeout(() => resolve(jsx(Fallback, {})), 0)
      },
    }

    const html = await drainStream(
      renderToReadableStream(
        jsx(
          ThemeContext.Provider,
          { value: 'outer' },
          jsx(ErrorBoundary, { fallback }, jsx(Content, {}))
        )
      )
    )

    expect(html).toContain('<span>fallback:outer</span>')
    expect(html).not.toContain('fallback:default')
    expect(warnSpy).not.toHaveBeenCalled()
  })

  it('resumes synchronous ErrorBoundary fallback rendering with outer provider values', async () => {
    const { createContext, useContext, jsx, ErrorBoundary } = await importIndex()

    const ThemeContext = createContext('default')
    const Content = () => {
      throw new Error('boom')
    }

    expect(
      `${await jsx(
        ThemeContext.Provider,
        { value: 'outer' },
        jsx(
          ErrorBoundary,
          {
            fallbackRender: (error: Error) =>
              jsx('span', {}, `fallback:${useContext(ThemeContext)}:${error.message}`),
          },
          jsx(Content, {})
        )
      ).toString()}`
    ).toBe('<span>fallback:outer:boom</span>')
    expect(warnSpy).not.toHaveBeenCalled()
  })

  it('resumes synchronous ErrorBoundary fallbackRender components with outer provider values', async () => {
    const { createContext, useContext, jsx, ErrorBoundary } = await importIndex()

    const ThemeContext = createContext('default')
    const Content = () => {
      throw new Error('boom')
    }
    const Fallback = () => jsx('span', {}, `fallback:${useContext(ThemeContext)}`)

    expect(
      `${await jsx(
        ThemeContext.Provider,
        { value: 'outer' },
        jsx(
          ErrorBoundary,
          {
            fallbackRender: () => jsx(Fallback, {}),
          },
          jsx(Content, {})
        )
      ).toString()}`
    ).toBe('<span>fallback:outer</span>')
    expect(warnSpy).not.toHaveBeenCalled()
  })

  it('resumes synchronous ErrorBoundary fallback prop rendering with outer provider values', async () => {
    const { createContext, useContext, jsx, ErrorBoundary } = await importIndex()

    const ThemeContext = createContext('default')
    const Content = () => {
      throw new Error('boom')
    }
    const Fallback = () => jsx('span', {}, `fallback:${useContext(ThemeContext)}`)

    expect(
      `${await jsx(
        ThemeContext.Provider,
        { value: 'outer' },
        jsx(ErrorBoundary, { fallback: jsx(Fallback, {}) }, jsx(Content, {}))
      ).toString()}`
    ).toBe('<span>fallback:outer</span>')
    expect(warnSpy).not.toHaveBeenCalled()
  })
})
