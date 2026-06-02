import { Hono } from '../../hono'
import { env, getRuntimeKey } from '.'

const mockGlobalProperty = (property: PropertyKey, value: unknown): (() => void) => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, property)

  Object.defineProperty(globalThis, property, {
    configurable: true,
    writable: true,
    value,
  })

  return () => {
    if (descriptor) {
      Object.defineProperty(globalThis, property, descriptor)
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (globalThis as any)[property]
    }
  }
}

describe('getRuntimeKey', () => {
  it('Should return the current runtime key', () => {
    // Now, using the `bun run test` command.
    // But `vitest` depending Node.js will run this test so the RuntimeKey will be `node`.
    expect(getRuntimeKey()).toBe('node')
  })
})

describe('env', () => {
  describe('Types', () => {
    type Env = {
      Bindings: {
        MY_VAR: string
      }
    }

    it('Should not throw type errors with env has generics', () => {
      const app = new Hono()
      app.get('/var', (c) => {
        const { MY_VAR } = env<{ MY_VAR: string }>(c)
        expectTypeOf<string>(MY_VAR)
        return c.json({
          var: MY_VAR,
        })
      })
    })

    it('Should not throw type errors with Hono has generics', () => {
      const app = new Hono<Env>()

      app.get('/var', (c) => {
        const { MY_VAR } = env(c)
        expectTypeOf<string>(MY_VAR)
        return c.json({
          var: MY_VAR,
        })
      })
    })

    it('Should not throw type errors with env and Hono have generics', () => {
      const app = new Hono<Env>()

      app.get('/var', (c) => {
        const { MY_VAR } = env<{ MY_VAR: string }>(c)
        expectTypeOf<string>(MY_VAR)
        return c.json({
          var: MY_VAR,
        })
      })
    })
  })

  describe('Runtime env handlers', () => {
    it('Should use bun env when runtime is bun', async () => {
      const userAgentSpy = vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Bun')

      try {
        expect(getRuntimeKey()).toBe('bun')

        const app = new Hono().get('/var', (c) => {
          expect(env(c)).toBe(process.env)
          return c.text('ok')
        })

        await app.request('/var')
      } finally {
        userAgentSpy.mockRestore()
      }
    })

    it('Should use node env when userAgent is not supported', async () => {
      const userAgentSpy = vi
        .spyOn(navigator, 'userAgent', 'get')
        .mockReturnValue(undefined as unknown as string)
      const restoreEdgeRuntime = mockGlobalProperty('EdgeRuntime', undefined)
      const restoreFastly = mockGlobalProperty('fastly', undefined)

      try {
        expect(getRuntimeKey()).toBe('node')

        const app = new Hono().get('/var', (c) => {
          expect(env(c)).toBe(process.env)
          return c.text('ok')
        })

        await app.request('/var')
      } finally {
        userAgentSpy.mockRestore()
        restoreEdgeRuntime()
        restoreFastly()
      }
    })

    it('Should use edge-light env when runtime is edge-light', async () => {
      const userAgentSpy = vi
        .spyOn(navigator, 'userAgent', 'get')
        .mockReturnValue(undefined as unknown as string)
      const restoreEdgeRuntime = mockGlobalProperty('EdgeRuntime', 'edge-light')

      try {
        expect(getRuntimeKey()).toBe('edge-light')

        const app = new Hono().get('/var', (c) => {
          expect(env(c)).toBe(process.env)
          return c.text('ok')
        })

        await app.request('/var')
      } finally {
        userAgentSpy.mockRestore()
        restoreEdgeRuntime()
      }
    })

    it('Should use deno env when runtime is deno', async () => {
      const userAgentSpy = vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Deno')
      const denoEnv = { MY_VAR: 'deno' }

      vi.stubGlobal('Deno', {
        env: {
          toObject: vi.fn(() => denoEnv),
        },
      })

      try {
        expect(getRuntimeKey()).toBe('deno')

        const app = new Hono().get('/var', (c) => {
          expect(env(c)).toBe(denoEnv)
          return c.text('ok')
        })

        await app.request('/var')
      } finally {
        userAgentSpy.mockRestore()
        vi.unstubAllGlobals()
      }
    })

    it('Should use workerd env when runtime is workerd', async () => {
      const userAgentSpy = vi
        .spyOn(navigator, 'userAgent', 'get')
        .mockReturnValue('Cloudflare-Workers')
      const bindings = { MY_VAR: 'workerd' }

      try {
        expect(getRuntimeKey()).toBe('workerd')

        const app = new Hono<{ Bindings: typeof bindings }>().get('/var', (c) => {
          expect(env(c)).toBe(bindings)
          return c.text('ok')
        })

        await app.request('/var', undefined, bindings)
      } finally {
        userAgentSpy.mockRestore()
      }
    })

    it('Should use fastly env when runtime is fastly', async () => {
      const userAgentSpy = vi
        .spyOn(navigator, 'userAgent', 'get')
        .mockReturnValue(undefined as unknown as string)
      const restoreFastly = mockGlobalProperty('fastly', {})

      try {
        expect(getRuntimeKey()).toBe('fastly')

        const app = new Hono().get('/var', (c) => {
          expect(env(c)).toEqual({})
          return c.text('ok')
        })

        await app.request('/var')
      } finally {
        userAgentSpy.mockRestore()
        restoreFastly()
      }
    })

    it('Should use other env when runtime is other', async () => {
      const userAgentSpy = vi
        .spyOn(navigator, 'userAgent', 'get')
        .mockReturnValue(undefined as unknown as string)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const global = globalThis as any
      const restoreEdgeRuntime = mockGlobalProperty('EdgeRuntime', undefined)
      const restoreFastly = mockGlobalProperty('fastly', undefined)
      let originalProcessRelease: PropertyDescriptor | undefined
      if (global?.process?.release?.name === 'node') {
        originalProcessRelease = Object.getOwnPropertyDescriptor(process, 'release')
        Object.defineProperty(process, 'release', {
          ...originalProcessRelease,
          value: {
            ...process.release,
            name: 'other',
          },
        })
      }

      try {
        expect(getRuntimeKey()).toBe('other')

        const app = new Hono().get('/var', (c) => {
          expect(env(c)).toEqual({})
          return c.text('ok')
        })

        await app.request('/var')
      } finally {
        userAgentSpy.mockRestore()
        restoreEdgeRuntime()
        restoreFastly()
        if (originalProcessRelease) {
          Object.defineProperty(process, 'release', originalProcessRelease)
        }
      }
    })
  })
})
