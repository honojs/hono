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
  /**
   * Call `fn` with the current value and whenever it changes. Returns an unsubscribe function.
   * It is an effect. So in a component, it is kept and disposed like `effect()`.
   */
  subscribe(fn: (value: T) => void): () => void
  readonly [SIGNAL]: true
}

export interface Signal<T> extends ReadonlySignal<T> {
  value: T
}

// A signal has `s`. An effect and a component have `d`. A computed has both.
type Reactive = {
  v: number // version. incremented when the value changes
  s?: Set<Reactive> // subscribers
  d?: Map<Reactive, number> // dependencies, and their versions when they were read
  n?: () => void // notify that a dependency may have changed
  r?: () => void // make the value and the version up to date. only for a computed
  h?: unknown[][] // signals, computeds and effects created in the component. only for a component
  i?: number // index of the next one to be created in the component
  c?: number // number of the ones created in the first render of the component
}

// The renderer may swallow an error in a re-render, so log it too
const throwOrderError = (): never => {
  const error = new Error(
    'signal(), computed() and effect() must be called in the same order in every render'
  )
  console.error(error)
  throw error
}

// In a component, return the one created by the same call in the first render.
// `getArg` returns the argument of the latest render.
const perComponent = <T, A>(kind: number, create: (getArg: () => A) => T, arg: A): T => {
  const observer = currentObserver
  if (!observer?.h) {
    return create(() => arg)
  }
  const index = observer.i!++
  if (observer.c !== undefined && (index >= observer.c || observer.h[index][2] !== kind)) {
    throwOrderError()
  }
  const slot = (observer.h[index] ||= [undefined, undefined, kind]) as [T?, A?, number?]
  slot[1] = arg
  return (slot[0] ||= create(() => slot[1] as A))
}

let currentObserver: Reactive | undefined
let globalVersion = 0 // incremented when any signal is written
let batchDepth = 0
let isScheduled = false
let isFlushing = false
let isServerRender = false
const pendingEffects: Set<() => void> = new Set()

// A computed subscribes to its dependencies only while it has subscribers. So a computed that
// nobody subscribes to is not referenced by its dependencies, and can be collected.
const subscribe = (source: Reactive, observer: Reactive): void => {
  if (!source.s!.size) {
    source.d?.forEach((_, dependency) => subscribe(dependency, source))
  }
  source.s!.add(observer)
}

const unsubscribe = (source: Reactive, observer: Reactive): void => {
  if (source.s!.delete(observer) && !source.s!.size) {
    source.d?.forEach((_, dependency) => unsubscribe(dependency, source))
  }
}

const track = (source: Reactive): void => {
  const observer = currentObserver
  if (observer) {
    observer.d!.set(source, source.v)
    if (!observer.s || observer.s.size) {
      subscribe(source, observer)
    }
  }
}

const untrack = (observer: Reactive): void => {
  observer.d!.forEach((_, source) => unsubscribe(source, observer))
  observer.d!.clear()
}

const isStale = (observer: Reactive): boolean => {
  for (const [source, version] of observer.d!) {
    source.r?.()
    if (source.v !== version) {
      return true
    }
  }
  return false
}

const runWith = <T>(observer: Reactive | undefined, fn: () => T): T => {
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
            // batch() may be called in a component or a computed, so do not track here
            runWith(undefined, run)
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

const notify = (source: Reactive): void => {
  // the subscribers may change while they are notified, so iterate over a copy
  ;[...source.s!].forEach((observer) => observer.n!())
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
    return effect(() => {
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
  const reactive: Reactive = { v: 0, s: new Set() }
  const read = () => {
    track(reactive)
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
        reactive.v++
        globalVersion++
        notify(reactive)
      }
    },
    peek: () => value,
    subscribe: createSubscribe(read),
  }
}

const createComputed = <T>(fn: () => T): ReadonlySignal<T> => {
  let value: T
  let error: unknown
  let state = 0 // 0: not computed, 1: computing, 2: has a value, 3: has an error
  let isNotified = false // a dependency may have changed. it is notified only while it has subscribers
  let checkedAt = -1 // `globalVersion` when it was confirmed to be up to date
  const reactive: Reactive = {
    v: 0,
    s: new Set(),
    d: new Map(),
    n: () => {
      if (!isNotified) {
        isNotified = true
        notify(reactive)
      }
    },
    r: () => {
      if (state === 1) {
        throw new Error('Cycle detected')
      }
      // With subscribers, it is notified of a change. Without them, nothing has changed if no
      // signal was written since the last check.
      if (state && (reactive.s!.size ? !isNotified : checkedAt === globalVersion)) {
        return
      }
      if (!state || isStale(reactive)) {
        const prevState = state
        const prevValue = value
        untrack(reactive)
        state = 1
        try {
          value = runWith(reactive, fn)
          state = 2
        } catch (e) {
          error = e
          state = 3
        }
        if (state === 3 || state !== prevState || !Object.is(prevValue, value)) {
          reactive.v++
        }
      }
      isNotified = false
      checkedAt = globalVersion
    },
  }
  const read = () => {
    reactive.r!()
    track(reactive)
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
  let hasRun = false
  let disposed = false
  const runCleanup = () => {
    const c = cleanup
    cleanup = undefined
    if (c) {
      runWith(undefined, c)
    }
  }
  const run = () => {
    // a computed may be notified but not changed, so check the versions
    if (!disposed && (!hasRun || isStale(reactive))) {
      hasRun = true
      runCleanup()
      untrack(reactive)
      cleanup = runWith(reactive, fn)
    }
  }
  const reactive: Reactive = {
    v: 0,
    d: new Map(),
    n: () => pendingEffects.add(run),
  }
  run()
  return () => {
    disposed = true
    pendingEffects.delete(run)
    untrack(reactive)
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
  const run = () => isStale(observer) && onChange()
  const observer: Reactive = {
    v: 0,
    d: new Map(),
    n: () => pendingEffects.add(run),
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
    pendingEffects.delete(run)
    if (fn) {
      observer.i = 0
      try {
        const result = runWith(observer, fn)
        if (observer.i !== (observer.c ??= observer.i)) {
          throwOrderError()
        }
        return result
      } catch (e) {
        if (observer.c === undefined) {
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
 * render, so do not call them in a condition or a loop. It throws if the order changes.
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
  perComponent(0, (getInitialValue) => createSignal(getInitialValue()), initialValue)

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
  perComponent(1, (getFn) => createComputed(() => getFn()()), fn)

/**
 * Run `fn` immediately, and re-run it whenever the signals read in it change.
 * If `fn` returns a function, it is called before the next run and on dispose.
 *
 * In a component, the effect is created in the first render and disposed when the component is
 * unmounted. It runs during the first render, so use a `ref` callback to access the DOM.
 * It re-runs only when a signal read in it changes. `fn` of the latest render is used then.
 * On the server, the effect in a component does not run. But the one after `await` in an async
 * component runs and is never disposed, so do not call `effect()` there.
 *
 * @experimental
 * `effect` is an experimental feature.
 * The behavior in a component might be changed.
 *
 * @returns A function to dispose the effect.
 */
export const effect = (fn: () => void | (() => void)): (() => void) =>
  isServerRender ? () => {} : perComponent(2, (getFn) => createEffect(() => getFn()()), fn)

/**
 * Run `fn` without tracking the signals read in it.
 *
 * @experimental
 * `untracked` is an experimental feature.
 * The behavior in a component might be changed.
 */
export const untracked = <T>(fn: () => T): T => runWith(undefined, fn)
