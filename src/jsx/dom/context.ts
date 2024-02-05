import type { Child } from '../base'
import { DOM_ERROR_HANDLER } from '../constants'
import type { Context } from '../context'
import { globalContexts } from '../context'
import { Fragment } from './jsx-runtime'

export const createContextProviderFunction =
  <T>(values: T[]) =>
  ({ value, children }: { value: T; children: Child[] }) => {
    const res = Fragment({
      children: [
        {
          tag: () => {
            values.push(value)
          },
        },
        ...(children as Child[]),
        {
          tag: () => {
            values.pop()
          },
        },
      ],
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(res as any)[DOM_ERROR_HANDLER] = (err: unknown) => {
      values.pop()
      throw err
    }
    return res
  }

export const createContext = <T>(defaultValue: T): Context<T> => {
  const values = [defaultValue]
  const context = {
    values,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Provider: createContextProviderFunction(values) as any,
  }
  globalContexts.push(context)
  return context
}
