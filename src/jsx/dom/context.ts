import type { FC, Child } from '..'
import { Fragment } from './jsx-runtime'
import { ERROR_HANDLER } from './render'

export interface Context<T> {
  values: T[]
  Provider: FC<{ value: T }>
}

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
    ;(res as any)[ERROR_HANDLER] = (err: unknown) => {
      values.pop()
      throw err
    }
    return res
  }

export const createContext = <T>(defaultValue: T): Context<T> => {
  const values = [defaultValue]
  return {
    values,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Provider: createContextProviderFunction(values) as any,
  }
}

export const useContext = <T>(context: Context<T>): T => {
  return context.values.at(-1) as T
}
