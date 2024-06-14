/**
 * Provide hooks used only in jsx/dom
 */

import { useContext } from '../../context'
import { createContext } from '../context'
import { useCallback, useState } from '../../hooks'

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
export const FormContext = createContext<FormStatus>({
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

export const useFormStatus = (): FormStatus => {
  return useContext(FormContext)
}

export const useOptimistic = <T, N>(
  state: T,
  updateState: (currentState: T, action: N) => T
): [T, (action: N) => void] => {
  const [optimisticState, setOptimisticState] = useState(state)
  Promise.all(actions).finally(() => {
    setOptimisticState(state)
  })

  const cb = useCallback((newData: N) => {
    setOptimisticState((currentState) => updateState(currentState, newData))
  }, [])

  return [optimisticState, cb]
}

export const useActionState = <T>(fn: Function, initialState: T): [T, Function] => {
  const [state, setState] = useState(initialState)
  const actionState = async (data: FormData) => {
    setState(await fn(state, data))
  }
  return [state, actionState]
}
