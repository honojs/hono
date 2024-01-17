import type { Child } from '../index.ts'
import type { Context } from '../context.ts'
import { Fragment } from './jsx-runtime.ts'
import { ERROR_HANDLER } from './render.ts'

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
