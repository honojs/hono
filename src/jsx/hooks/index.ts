import { updateStack, updateCallbacks, invokeUpdate, UpdatePhase } from '../dom'
import type { UpdateData } from '../dom'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const stateMap = new WeakMap<UpdateData, any[]>()
type DepsData = [readonly unknown[] | undefined, (() => void) | undefined]
const effectDepsMap = new WeakMap<UpdateData, DepsData[]>()
const callbackMap = new WeakMap<UpdateData, [Function, readonly unknown[]][]>()
const useResultStash = new WeakMap<UpdateData, Map<number, unknown>>()
const promiseMap = new WeakMap<Promise<unknown>, unknown>()

export const useState = <T>(
  initialState: T
): [T, (newState: T | ((currentState: T) => T)) => void] => {
  const updateData = updateStack.at(-1)
  if (!updateData) {
    return [initialState, () => {}]
  }

  let stateArray = stateMap.get(updateData) as T[]
  if (!stateArray) {
    stateArray = []
    stateMap.set(updateData, stateArray)
  }

  const [, , hookIndex] = updateData
  updateData[2]++
  const currentState =
    stateArray.length > hookIndex ? stateArray[hookIndex] : (stateArray[hookIndex] = initialState)
  const setState = (newState: T | ((currentState: T) => T)) => {
    const latestState = stateArray[hookIndex] || currentState
    if (typeof newState === 'function') {
      newState = (newState as (currentState: T) => T)(latestState)
    }

    if (newState !== latestState) {
      ;(stateArray as unknown[])[hookIndex] = newState
      if (updateData[2] === UpdatePhase.Updating) {
        updateData[2] = UpdatePhase.UpdateAgain
      } else {
        invokeUpdate(updateData)
      }
    }
  }
  return [currentState, setState]
}

export const useEffect = (effect: () => void | (() => void), deps?: readonly unknown[]): void => {
  const updateData = updateStack.at(-1)
  if (!updateData) {
    return
  }

  let effectDepsArray = effectDepsMap.get(updateData)
  if (!effectDepsArray) {
    effectDepsArray = []
    effectDepsMap.set(updateData, effectDepsArray)
  }

  const [, , hookIndex] = updateData
  updateData[2]++
  const [prevDeps, cleanup] = effectDepsArray[hookIndex] || []
  if (!deps || !prevDeps || deps.some((dep, i) => dep !== prevDeps[i])) {
    if (cleanup) {
      cleanup()
    }

    const depsData: DepsData = [deps, undefined]
    const executer = () => {
      const cleanup = effect()
      if (cleanup) {
        depsData[1] = cleanup
      }
      return cleanup
    }
    effectDepsArray[hookIndex] = depsData

    updateCallbacks.set(updateData[1], [...(updateCallbacks.get(updateData[1]) || []), executer])
  }
}

export const useCallback = <T extends (...args: unknown[]) => unknown>(
  callback: T,
  deps: readonly unknown[]
): T => {
  const updateData = updateStack.at(-1)
  if (!updateData) {
    return callback
  }

  let callbackArray = callbackMap.get(updateData)
  if (!callbackArray) {
    callbackArray = []
    callbackMap.set(updateData, callbackArray)
  }

  const [, , hookIndex] = updateData
  updateData[2]++

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
  const cachedRes = promiseMap.get(promise)
  if (cachedRes) {
    return cachedRes as T
  }
  promise.then((res) => promiseMap.set(promise, res))

  const updateData = updateStack.at(-1)
  if (!updateData) {
    throw promise
  }

  const useMap = useResultStash.get(updateData) || new Map<number, unknown>()
  if (useMap.size === 0) {
    useResultStash.set(updateData, useMap)
  }

  const [, , hookIndex] = updateData
  updateData[2]++

  if (useMap.has(hookIndex)) {
    return useMap.get(hookIndex) as T
  }

  promise.then((res) => useMap.set(hookIndex, res))
  throw promise
}
