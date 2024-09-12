/**
 * Provide hooks used only in jsx/dom
 */

import { PERMALINK } from '../../constants'
import type { Context } from '../../context'
import { useContext } from '../../context'
import { useCallback, useState } from '../../hooks'
import { createContext } from '../context'

type FormStatus =
  | {
      pending: false
      data: null
      method: null
      action: null
    }
  | {
      pending: true
      data: FormData
      method: 'get' | 'post'
      action: string | ((formData: FormData) => void | Promise<void>)
    }
export const FormContext: Context<FormStatus> = createContext<FormStatus>({
  pending: false,
  data: null,
  method: null,
  action: null,
})

const actions: Set<Promise<unknown>> = new Set()
export const registerAction = (action: Promise<unknown>) => {
  actions.add(action)
  action.finally(() => actions.delete(action))
}

/**
 * This hook returns the current form status
 * @returns FormStatus
 */
export const useFormStatus = (): FormStatus => {
  return useContext(FormContext)
}

/**
 * This hook returns the current state and a function to update the state optimistically
 * The current state is updated optimistically and then reverted to the original state when all actions are resolved
 * @param state
 * @param updateState
 * @returns [T, (action: N) => void]
 */
export const useOptimistic = <T, N>(
  state: T,
  updateState: (currentState: T, action: N) => T
): [T, (action: N) => void] => {
  const [optimisticState, setOptimisticState] = useState(state)
  if (actions.size > 0) {
    Promise.all(actions).finally(() => {
      setOptimisticState(state)
    })
  } else {
    setOptimisticState(state)
  }

  const cb = useCallback((newData: N) => {
    setOptimisticState((currentState) => updateState(currentState, newData))
  }, [])

  return [optimisticState, cb]
}

/**
 * This hook returns the current state and a function to update the state by form action
 * @param fn
 * @param initialState
 * @param permalink
 * @returns [T, (data: FormData) => void]
 */
export const useActionState = <T>(
  fn: Function,
  initialState: T,
  permalink?: string
): [T, Function] => {
  const [state, setState] = useState(initialState)
  const actionState = async (data: FormData) => {
    setState(await fn(state, data))
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(actionState as any)[PERMALINK] = permalink
  return [state, actionState]
}
