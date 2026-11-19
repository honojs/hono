/**
 * @module
 * Signals for Hono JSX.
 *
 * @experimental
 * `hono/jsx/signal` is an experimental feature.
 * The behavior in a component might be changed.
 */

import { SIGNAL, signalHook } from '../constants'
import type { SignalScope } from '../constants'

export interface ReadonlySignal<T> {
  readonly value: T
  /** Read the value without tracking it as a dependency. */
  peek(): T
  /** Call `fn` with the current value and whenever it changes. Returns an unsubscribe function. */
  subscribe(fn: (value: T) => void): () => void
  readonly [SIGNAL]: true
}

export interface Signal<T> extends ReadonlySignal<T> {
  value: T
}

type Source = {
  s: Set<Observer> // subscribers
}
type Observer = {
  d: Set<Source> // dependencies
  n: () => void // notify that a dependency has changed
  h?: unknown[][] // signals, computeds and effects created in the component. only for a component
  i?: number // index of the next one to be created in the component
}

// In a component, return the one created by the same call in the first render.
// `getArg` returns the argument of the latest render.
const perComponent = <T, A>(create: (getArg: () => A) => T, arg: A): T => {
  const observer = currentObserver
  if (!observer?.h) {
    return create(() => arg)
  }
  const slot = (observer.h[observer.i!++] ||= []) as [T?, A?]
  slot[1] = arg
  return (slot[0] ||= create(() => slot[1] as A))
}

let currentObserver: Observer | undefined
let batchDepth = 0
let isScheduled = false
let isFlushing = false
let isServerRender = false
const pendingEffects: Set<() => void> = new Set()

const track = (source: Source): void => {
  if (currentObserver) {
    source.s.add(currentObserver)
    currentObserver.d.add(source)
  }
}

const untrack = (observer: Observer): void => {
  observer.d.forEach((source) => source.s.delete(observer))
  observer.d.clear()
}

const runWith = <T>(observer: Observer | undefined, fn: () => T): T => {
  const prev = currentObserver
  currentObserver = observer
  try {
    return fn()
  } finally {
    currentObserver = prev
  }
}

const flush = (): void => {
  isScheduled = false
  if (isFlushing) {
    return
  }
  isFlushing = true
  let hasError = false
  let error: unknown
  try {
    for (let i = 0; pendingEffects.size; i++) {
      if (i === 100) {
        pendingEffects.clear()
        throw new Error('Cycle detected')
      }
      for (const run of [...pendingEffects]) {
        try {
          // skip the one that was disposed or already run by the others in this loop
          if (pendingEffects.delete(run)) {
            run()
          }
        } catch (e) {
          // run the remaining effects, then throw the first error
          if (!hasError) {
            hasError = true
            error = e
          }
        }
      }
    }
  } finally {
    isFlushing = false
  }
  if (hasError) {
    throw error
  }
}

const notify = (source: Source): void => {
  // an observer removes itself from `source.s` when it is notified or re-run, so iterate over a copy
  ;[...source.s].forEach((observer) => observer.n())
  if (pendingEffects.size && !batchDepth && !isScheduled && !isFlushing) {
    isScheduled = true
    queueMicrotask(flush)
  }
}

const createSubscribe =
  <T>(read: () => T) =>
  (fn: (value: T) => void): (() => void) => {
    let initialized = false
    let prev: T
    return createEffect(() => {
      const value = read()
      if (!initialized || !Object.is(prev, value)) {
        initialized = true
        prev = value
        untracked(() => fn(value))
      }
    })
  }

const createSignal = <T>(initialValue: T): Signal<T> => {
  let value = initialValue
  const source: Source = { s: new Set() }
  const read = () => {
    track(source)
    return value
  }
  return {
    [SIGNAL]: true,
    get value() {
      return read()
    },
    set value(newValue: T) {
      if (!Object.is(value, newValue)) {
        value = newValue
        notify(source)
      }
    },
    peek: () => value,
    subscribe: createSubscribe(read),
  }
}

const createComputed = <T>(fn: () => T): ReadonlySignal<T> => {
  let value: T
  let error: unknown
  let state = 0 // 0: dirty, 1: computing, 2: cached, 3: cached error
  const source: Source = { s: new Set() }
  const observer: Observer = {
    d: new Set(),
    n: () => {
      if (state > 1) {
        state = 0
        // stop tracking until the next read, so that an unused computed can be collected
        untrack(observer)
        notify(source)
      }
    },
  }
  const read = () => {
    track(source)
    if (state === 1) {
      throw new Error('Cycle detected')
    }
    if (!state) {
      state = 1
      try {
        value = runWith(observer, fn)
        state = 2
      } catch (e) {
        error = e
        state = 3
      }
    }
    if (state === 3) {
      throw error
    }
    return value
  }
  return {
    [SIGNAL]: true,
    get value() {
      return read()
    },
    peek: () => untracked(read),
    subscribe: createSubscribe(read),
  }
}

const createEffect = (fn: () => void | (() => void)): (() => void) => {
  let cleanup: void | (() => void)
  let disposed = false
  const runCleanup = () => {
    const c = cleanup
    cleanup = undefined
    if (c) {
      runWith(undefined, c)
    }
  }
  const run = () => {
    if (!disposed) {
      runCleanup()
      untrack(observer)
      cleanup = runWith(observer, fn)
    }
  }
  const observer: Observer = {
    d: new Set(),
    n: () => pendingEffects.add(run),
  }
  run()
  return () => {
    disposed = true
    pendingEffects.delete(run)
    untrack(observer)
    runCleanup()
  }
}

/**
 * Apply the updates in `fn` at once. The effects run only once, synchronously at the end of the
 * outermost batch. Outside of a batch, the effects run in a microtask.
 *
 * @experimental
 * `batch` is an experimental feature.
 * The behavior in a component might be changed.
 */
export const batch = <T>(fn: () => T): T => {
  batchDepth++
  try {
    return fn()
  } finally {
    if (!--batchDepth) {
      flush()
    }
  }
}

// for the DOM renderer. `onChange` runs with the effects when a signal read in the scope changes
signalHook.s = (onChange) => {
  const created: unknown[][] = []
  const observer: Observer = {
    d: new Set(),
    n: () => pendingEffects.add(onChange),
    h: created,
  }
  const dispose = () => {
    // dispose the effects. a signal and a computed are objects
    created.forEach(([item]) => typeof item === 'function' && item())
    created.length = 0
  }
  return ((fn?: () => unknown) => {
    untrack(observer)
    // it is rendered or unmounted now, so the pending re-render is not needed
    pendingEffects.delete(onChange)
    if (fn) {
      const isFirst = !created.length
      observer.i = 0
      try {
        return runWith(observer, fn)
      } catch (e) {
        if (isFirst) {
          // the component may never be mounted, so do not leave the effects
          dispose()
        }
        throw e
      }
    }
    dispose()
  }) as SignalScope
}

// for the server renderer. `effect()` does nothing in a component on the server, like `useEffect()`
signalHook.r = (fn) => {
  const prev = isServerRender
  isServerRender = true
  try {
    return fn()
  } finally {
    isServerRender = prev
  }
}

/**
 * Create a signal. Reading `.value` in a component, `computed()` or `effect()` tracks it as a
 * dependency, and writing to `.value` re-renders or re-runs them.
 *
 * In a component, the signal is created in the first render and kept until the component is
 * unmounted. `signal()`, `computed()` and `effect()` have to be called in the same order in every
 * render, so do not call them in a condition or a loop.
 *
 * @experimental
 * `signal` is an experimental feature.
 * The behavior in a component might be changed.
 *
 * @example
 * ```tsx
 * const Counter = () => {
 *   const count = signal(0)
 *   return <button onClick={() => count.value++}>{count}</button>
 * }
 * ```
 */
export const signal = <T>(initialValue: T): Signal<T> =>
  perComponent((getInitialValue) => createSignal(getInitialValue()), initialValue)

/**
 * Create a read-only signal derived from other signals.
 * `fn` is evaluated lazily, and the result is cached until a dependency changes.
 *
 * In a component, the computed is created in the first render and kept until the component is
 * unmounted. It is evaluated again only when a signal read in it changes, so read the values that
 * change through signals. `fn` of the latest render is used then.
 *
 * @experimental
 * `computed` is an experimental feature.
 * The behavior in a component might be changed.
 */
export const computed = <T>(fn: () => T): ReadonlySignal<T> =>
  perComponent((getFn) => createComputed(() => getFn()()), fn)

/**
 * Run `fn` immediately, and re-run it whenever the signals read in it change.
 * If `fn` returns a function, it is called before the next run and on dispose.
 *
 * In a component, the effect is created in the first render and disposed when the component is
 * unmounted. It runs during the first render, so use a `ref` callback to access the DOM.
 * It re-runs only when a signal read in it changes. `fn` of the latest render is used then.
 * On the server, the effect in a component does not run.
 *
 * @experimental
 * `effect` is an experimental feature.
 * The behavior in a component might be changed.
 *
 * @returns A function to dispose the effect.
 */
export const effect = (fn: () => void | (() => void)): (() => void) =>
  isServerRender ? () => {} : perComponent((getFn) => createEffect(() => getFn()()), fn)

/**
 * Run `fn` without tracking the signals read in it.
 *
 * @experimental
 * `untracked` is an experimental feature.
 * The behavior in a component might be changed.
 */
export const untracked = <T>(fn: () => T): T => runWith(undefined, fn)
