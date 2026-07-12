import { raw } from '../helper/html'
import type { HtmlEscapedString } from '../utils/html'
import { JSXFragmentNode } from './base'
import { DOM_RENDERER } from './constants'
import { createContextProviderFunction } from './dom/context'
import type { FC, PropsWithChildren } from './'

export interface Context<T> extends FC<PropsWithChildren<{ value: T }>> {
  values: T[]
  Provider: FC<PropsWithChildren<{ value: T }>>
}

export const globalContexts: Context<unknown>[] = []

/** Per-render context store, isolated per request so values never leak across renders. */
type RenderStore = WeakMap<Context<unknown>, unknown[]>

type AsyncLocalStorageLike<T> = {
  getStore(): T | undefined
  run<R>(store: T, callback: () => R): R
}
type AsyncLocalStorageClass = new <T>() => AsyncLocalStorageLike<T>
type AsyncHooksModule = { AsyncLocalStorage?: AsyncLocalStorageClass }

let alsProbed = false
let asyncLocalStorage: AsyncLocalStorageLike<RenderStore> | undefined
let fallbackStore: RenderStore | undefined
// Unsettled async renders on the fallback path. While > 0, a store-less
// context access is a post-`await` read that degraded to the default value
// — worth a one-time warning. Stays 0 in the browser DOM renderer.
let fallbackRendersInFlight = 0
let warnedFallbackDefault = false

const loadAsyncLocalStorage = (): AsyncLocalStorageLike<RenderStore> | undefined => {
  if (alsProbed) {
    return asyncLocalStorage
  }
  alsProbed = true

  const global = globalThis as unknown as {
    process?: {
      getBuiltinModule?: (specifier: string) => AsyncHooksModule
      mainModule?: { require?: (specifier: string) => AsyncHooksModule }
    }
  }
  let AsyncLocalStorage: AsyncLocalStorageClass | undefined
  for (const probe of [
    // Node.js >= 20.16, Deno, Bun, Cloudflare Workers (nodejs_compat). Property
    // access only, so bundlers don't statically resolve `node:async_hooks`.
    () => global.process?.getBuiltinModule?.('node:async_hooks')?.AsyncLocalStorage,
    // Node.js < 20.16 has no `process.getBuiltinModule`, but a CJS entrypoint
    // exposes the main module's `require` here.
    () => global.process?.mainModule?.require?.('node:async_hooks')?.AsyncLocalStorage,
  ]) {
    try {
      AsyncLocalStorage = probe()
    } catch {}
    if (AsyncLocalStorage) {
      break
    }
  }

  if (AsyncLocalStorage) {
    asyncLocalStorage = new AsyncLocalStorage<RenderStore>()
  }
  return asyncLocalStorage
}

const getCurrentStore = (): RenderStore | undefined => {
  return loadAsyncLocalStorage()?.getStore() || fallbackStore
}

const warnIfStorelessAccess = (): void => {
  if (fallbackRendersInFlight > 0 && !warnedFallbackDefault) {
    warnedFallbackDefault = true
    console.warn(
      'hono/jsx: AsyncLocalStorage is unavailable in this runtime, so useContext() after an await in an async component falls back to the context default value during server-side rendering. To get provided values across await boundaries, use a runtime with AsyncLocalStorage (Node.js >= 20.16, Deno, Bun, or Cloudflare Workers with the nodejs_compat flag).'
    )
  }
}

// Write path: materializes the store entry so a Provider's push/pop pair
// operates on a per-render array.
const getContextValuesIn = <T>(store: RenderStore | undefined, context: Context<T>): T[] => {
  if (!store) {
    warnIfStorelessAccess()
    return context.values
  }

  let values = store.get(context as Context<unknown>) as T[] | undefined
  if (!values) {
    values = [context.values[0]]
    store.set(context as Context<unknown>, values)
  }
  return values
}

// Read path: never materializes a store entry — a missing entry always
// resolves to the default value, so reads stay allocation-free.
const readContextValueIn = <T>(store: RenderStore | undefined, context: Context<T>): T => {
  if (!store) {
    warnIfStorelessAccess()
    return context.values.at(-1) as T
  }
  const values = store.get(context as Context<unknown>) as T[] | undefined
  return values?.length ? (values.at(-1) as T) : context.values[0]
}

type LocalContexts = [Context<unknown>, unknown][]

const captureContextValues = (store: RenderStore | undefined): LocalContexts =>
  (store ? globalContexts.filter((c) => store.has(c)) : globalContexts).map((c) => [
    c,
    readContextValueIn(store, c),
  ])

const resumeWithContextValues = <T>(
  callback: () => T,
  store: RenderStore | undefined,
  contexts: LocalContexts
): T =>
  runWithRenderContext(() => {
    // Resolve each target array once so every pop operates on the same array
    // as its push, as the Provider in `createContext` does.
    const currentStore = getCurrentStore()
    const valuesPerContext = contexts.map(([context, value]) => {
      const values = getContextValuesIn(currentStore, context)
      values.push(value)
      return values
    })
    const popContextValues = () => {
      valuesPerContext.forEach((values) => {
        values.pop()
      })
    }
    try {
      const result = callback()
      if (result instanceof Promise) {
        return result.finally(popContextValues) as T
      }
      popContextValues()
      return result
    } catch (e) {
      popContextValues()
      throw e
    }
  }, store)

/**
 * Establish the request-scoped context store for a render.
 *
 * `resumeStore` continues a suspended subtree in the same store on the fallback
 * path (ignored when `AsyncLocalStorage` is available, where isolation is
 * automatic).
 *
 * Without `AsyncLocalStorage` a render can't be followed across `await`, so the
 * store lives in `fallbackStore` only during synchronous work (mirroring
 * React's request storage). Reading context after `await` then finds no store
 * and falls back to the default value — never another request's value.
 */
export const runWithRenderContext = <T>(callback: () => T, resumeStore?: RenderStore): T => {
  if (getCurrentStore()) {
    // Already inside a render (synchronously nested or resumed subtree).
    return callback()
  }

  const store = resumeStore ?? new WeakMap()
  const storage = loadAsyncLocalStorage()
  if (storage) {
    // AsyncLocalStorage path: request isolation propagates across `await`.
    return storage.run(store, callback)
  }

  // Fallback path (no AsyncLocalStorage).
  fallbackStore = store
  let result: T
  try {
    result = callback()
  } finally {
    fallbackStore = undefined
  }
  if (!warnedFallbackDefault && result instanceof Promise) {
    fallbackRendersInFlight++
    result = result.finally(() => {
      fallbackRendersInFlight--
    }) as T
  }
  return result
}

/**
 * Capture the current render store and return a resumer that re-establishes it
 * around a deferred continuation (e.g. a re-render after a suspended promise
 * settles). Shared by every suspension point so none reimplements it.
 */
export const captureRenderContext = (): (<T>(callback: () => T) => T) => {
  const store = getCurrentStore()
  const contexts = captureContextValues(store)
  return (callback) => resumeWithContextValues(callback, store, contexts)
}

/**
 * Create a context whose value can be provided with `<Context.Provider>` and
 * read with {@link useContext}.
 *
 * Server-side renders are isolated per request, so a provided value never leaks
 * into a concurrent request — even across `await` in an async component, when
 * `AsyncLocalStorage` is available (Node.js >= 20.16, Deno, Bun, Cloudflare
 * Workers with `nodejs_compat`). Without it, reading context after `await`
 * returns the default value; synchronous components and `use()`-based
 * suspension are unaffected.
 */
export const createContext = <T>(defaultValue: T): Context<T> => {
  const values = [defaultValue]
  const context: Context<T> = ((props): HtmlEscapedString | Promise<HtmlEscapedString> => {
    // Resolve the target array once, synchronously: the pop in `.finally()`
    // below may run later and must operate on the same array as the push.
    const contextValues = getContextValuesIn(getCurrentStore(), context)
    contextValues.push(props.value)
    let string
    try {
      string = props.children
        ? (Array.isArray(props.children)
            ? new JSXFragmentNode('', {}, props.children)
            : props.children
          ).toString()
        : ''
    } catch (e) {
      contextValues.pop()
      throw e
    }

    if (string instanceof Promise) {
      return string
        .finally(() => contextValues.pop())
        .then((resString) => raw(resString, (resString as HtmlEscapedString).callbacks))
    } else {
      contextValues.pop()
      return raw(string)
    }
  }) as Context<T>
  context.values = values
  context.Provider = context

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(context as any)[DOM_RENDERER] = createContextProviderFunction(values)

  globalContexts.push(context as Context<unknown>)

  return context
}

/**
 * Read the current value of a context created with {@link createContext}.
 *
 * Safe to call from async components after `await`. See {@link createContext}
 * for the per-runtime isolation guarantees.
 */
export const useContext = <T>(context: Context<T>): T => {
  return readContextValueIn(getCurrentStore(), context)
}
