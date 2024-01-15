import { nodeStack, update, STASH } from '../dom/render.ts'
import type { NodeObject } from '../dom/render.ts'

type UpdateStateFunction<T> = (newState: T | ((currentState: T) => T)) => void

const STASH_SATE = 0
export const STASH_EFFECT = 1
const STASH_CALLBACK = 2
const STASH_USE = 3

export type EffectData = [
  readonly unknown[] | undefined,
  (() => void | (() => void)) | undefined,
  (() => void) | undefined
]

const resolvedPromiseValueMap = new WeakMap<Promise<unknown>, unknown>()

export const useState = <T>(initialState: T | (() => T)): [T, UpdateStateFunction<T>] => {
  const resolveInitialState = () =>
    typeof initialState === 'function' ? (initialState as () => T)() : initialState

  const node = nodeStack.at(-1) as NodeObject
  if (!node) {
    return [resolveInitialState(), () => {}]
  }

  const stateArray = (node[STASH][1][STASH_SATE] ||= [])
  const hookIndex = node[STASH][0]++

  return (stateArray[hookIndex] ||= [
    resolveInitialState(),
    (newState: T | ((currentState: T) => T)) => {
      const stateData = stateArray[hookIndex]
      if (typeof newState === 'function') {
        newState = (newState as (currentState: T) => T)(stateData[0])
      }
      if (newState !== stateData[0]) {
        stateData[0] = newState
        update(node)
      }
    },
  ])
}

export const useEffect = (effect: () => void | (() => void), deps?: readonly unknown[]): void => {
  const node = nodeStack.at(-1) as NodeObject
  if (!node) {
    return
  }

  const effectDepsArray = (node[STASH][1][STASH_EFFECT] ||= [])
  const hookIndex = node[STASH][0]++

  const [prevDeps, , prevCleanup] = (effectDepsArray[hookIndex] ||= [])
  if (!deps || !prevDeps || deps.some((dep, i) => dep !== prevDeps[i])) {
    if (prevCleanup) {
      prevCleanup()
    }
    const data: EffectData = [
      deps,
      () => {
        data[1] = undefined
        const cleanup = effect()
        if (cleanup) {
          data[2] = cleanup
        }
      },
      undefined,
    ]
    effectDepsArray[hookIndex] = data
  }
}

export const useCallback = <T extends (...args: unknown[]) => unknown>(
  callback: T,
  deps: readonly unknown[]
): T => {
  const node = nodeStack.at(-1) as NodeObject
  if (!node) {
    return callback
  }

  const callbackArray = (node[STASH][1][STASH_CALLBACK] ||= [])
  const hookIndex = node[STASH][0]++

  const prevDeps = callbackArray[hookIndex]
  if (!prevDeps || deps.some((dep, i) => dep !== prevDeps[1][i])) {
    callbackArray[hookIndex] = [callback, deps]
  } else {
    callback = callbackArray[hookIndex][0] as T
  }
  return callback
}

export type RefObject<T> = { current: T | null }
export const useRef = <T>(initialValue: T | null): RefObject<T> => {
  return { current: initialValue }
}

export const use = <T>(promise: Promise<T>): T => {
  const cachedRes = resolvedPromiseValueMap.get(promise)
  if (cachedRes) {
    return cachedRes as T
  }
  promise.then((res) => resolvedPromiseValueMap.set(promise, res))

  const node = nodeStack.at(-1) as NodeObject
  if (!node) {
    throw promise
  }

  const promiseArray = (node[STASH][1][STASH_USE] ||= [])
  const hookIndex = node[STASH][0]++

  promise.then((res) => {
    promiseArray[hookIndex] = [res]
  })

  if (promiseArray[hookIndex]) {
    return promiseArray[hookIndex][0] as T
  }

  throw promise
}
