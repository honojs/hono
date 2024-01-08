import { updateStack } from '../dom'

const stateMap = new WeakMap<Function, any>()

export const useState = <T>(initialState: T): [T, (newState: T) => void] => {
  const update = updateStack[updateStack.length - 1]
  if (!update) {
    return [initialState, () => {}]
  }

  const currentState = stateMap.get(update) || initialState
  const setState = (newState: T) => {
    stateMap.set(update, newState)
    if (update) {
      updateStack.push(update)
      update()
      updateStack.pop()
    }
  }
  return [currentState, setState]
}
