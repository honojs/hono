import { updateStack, updateCallbacks, UpdatePhase } from '../dom'
import type { UpdateData } from '../dom'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const stateMap = new WeakMap<UpdateData, any[]>()
const effectDepsMap = new WeakMap<UpdateData, unknown[][]>()
const callbackMap = new WeakMap<UpdateData, [Function, unknown][]>()

export const useState = <T>(
  initialState: T
): [T, (newState: T) => void | ((currentState: T) => T)] => {
  const updateData = updateStack[updateStack.length - 1]
  if (!updateData) {
    return [initialState, () => {}]
  }

  let stateArray = stateMap.get(updateData)
  if (!stateArray) {
    stateArray = []
    stateMap.set(updateData, stateArray)
  }

  const [, hookIndex] = updateData
  updateData[1]++
  const currentState = stateArray[hookIndex] || initialState
  const setState = (newState: T | ((currentState: T) => T)) => {
    if (typeof newState === 'function') {
      newState = (newState as (currentState: T) => T)(currentState)
    }

    if (newState !== currentState) {
      ;(stateArray as unknown[])[hookIndex] = newState
      if (updateData[2] === UpdatePhase.Updating) {
        updateData[2] = UpdatePhase.UpdateAgain
      } else {
        updateStack.push(updateData)
        updateData[1] = 0
        updateData[0]()
        updateStack.pop()
      }
    }
  }
  return [currentState, setState]
}

export const useEffect = (effect: () => void | (() => void), deps?: unknown[]): void => {
  const updateData = updateStack[updateStack.length - 1]
  if (!updateData) {
    return
  }

  let effectDepsArray = effectDepsMap.get(updateData)
  if (!effectDepsArray) {
    effectDepsArray = []
    effectDepsMap.set(updateData, effectDepsArray)
  }

  const [, hookIndex] = updateData
  updateData[1]++
  const prevDeps = effectDepsArray[hookIndex] || []
  if (!deps || deps.some((dep, i) => dep !== prevDeps[i])) {
    if (deps) {
      effectDepsArray[hookIndex] = deps
    }
    updateCallbacks.set(updateData[0], [...(updateCallbacks.get(updateData[0]) || []), effect])
  }
}

export const useCallback = <T extends (...args: unknown[]) => unknown>(
  callback: T,
  deps?: unknown[]
): T => {
  const updateData = updateStack[updateStack.length - 1]
  if (!updateData) {
    return callback
  }

  let callbackArray = callbackMap.get(updateData)
  if (!callbackArray) {
    callbackArray = []
    callbackMap.set(updateData, callbackArray)
  }

  const [, hookIndex] = updateData
  updateData[1]++

  const prevDeps = callbackArray[hookIndex] || []
  if (!deps || deps.some((dep, i) => dep !== prevDeps[i])) {
    if (deps) {
      callbackArray[hookIndex] = [callback, deps]
    }
  } else {
    callback = callbackArray[hookIndex][0] as T
  }
  return callback
}
