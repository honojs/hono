/**
 * Provide hooks used only in jsx/dom
 */

import { useContext } from '../../context'
import { createContext } from '../context'
import { useState } from '../../hooks'

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

export const useFormStatus = (): FormStatus => {
  return useContext(FormContext)
}

export const useOptimistic = <T, N>(
  state: T,
  updateState: (currentState: T, action: N) => T
): [T, (action: N) => void] => {
  const [optimisticState, setOptimisticState] = useState(state)
  const { pending } = useContext(FormContext)
  if (!pending) {
    setOptimisticState(state)
  }
  return [
    pending ? optimisticState : state,
    (newData: N) => setOptimisticState((currentState) => updateState(currentState, newData)),
  ]
}

export const useActionState = <T>(fn: Function, initialState: T): [T, Function] => {
  const [state, setState] = useState(initialState)
  const actionState = async (data: FormData) => {
    setState(await fn(state, data))
  }
  return [state, actionState]
}
