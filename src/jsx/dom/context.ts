import type { Child } from '../base'
import { DOM_ERROR_HANDLER } from '../constants'
import type { Context } from '../context'
import { globalContexts } from '../context'
import { setInternalTagFlag } from './utils'

export const createContextProviderFunction =
  <T>(values: T[]): Function =>
  ({ value, children }: { value: T; children: Child[] }) => {
    if (!children) {
      return undefined
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const props: { children: any } = {
      children: [
        {
          tag: setInternalTagFlag(() => {
            values.push(value)
          }),
          props: {},
        },
      ],
    }
    if (Array.isArray(children)) {
      props.children.push(...children.flat())
    } else {
      props.children.push(children)
    }
    props.children.push({
      tag: setInternalTagFlag(() => {
        values.pop()
      }),
      props: {},
    })
    const res = { tag: '', props, type: '' }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(res as any)[DOM_ERROR_HANDLER] = (err: unknown) => {
      values.pop()
      throw err
    }
    return res
  }

export const createContext = <T>(defaultValue: T): Context<T> => {
  const values = [defaultValue]
  const context: Context<T> = createContextProviderFunction(values) as Context<T>
  context.values = values
  context.Provider = context
  globalContexts.push(context as Context<unknown>)
  return context
}
