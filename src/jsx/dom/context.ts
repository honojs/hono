import type { Child } from '../base'
import { DOM_ERROR_HANDLER } from '../constants'
import type { Context } from '../context'
import { globalContexts } from '../context'
import { Fragment } from './jsx-runtime'
import { setInternalTagFlag } from './utils'

export const createContextProviderFunction = <T>(values: T[]) =>
  setInternalTagFlag(({ value, children }: { value: T; children: Child[] }) => {
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
    })
    const res = Fragment(props)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(res as any)[DOM_ERROR_HANDLER] = (err: unknown) => {
      values.pop()
      throw err
    }
    return res
  })

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
