import type { Child } from '../base.ts'
import { DOM_ERROR_HANDLER } from '../constants.ts'
import type { Context } from '../context.ts'
import { globalContexts } from '../context.ts'
import { Fragment } from './jsx-runtime.ts'
import { setInternalTagFlag } from './utils.ts'

export const createContextProviderFunction = <T>(values: T[]): Function =>
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
