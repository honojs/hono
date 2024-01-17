import { raw } from '../helper/html/index.ts'
import type { HtmlEscapedString } from '../utils/html.ts'
import { createContextProviderFunction } from './dom/context.ts'
import { RENDER_TO_DOM } from './dom/render.ts'
import { JSXFragmentNode } from './index.ts'
import type { FC } from './index.ts'

export interface Context<T> {
  values: T[]
  Provider: FC<{ value: T }>
}

export const createContext = <T>(defaultValue: T): Context<T> => {
  const values = [defaultValue]
  const context: Context<T> = {
    values,
    Provider(props): HtmlEscapedString | Promise<HtmlEscapedString> {
      values.push(props.value)
      const string = props.children
        ? (Array.isArray(props.children)
            ? new JSXFragmentNode('', {}, props.children)
            : props.children
          ).toString()
        : ''
      values.pop()

      if (string instanceof Promise) {
        return Promise.resolve().then<HtmlEscapedString>(async () => {
          values.push(props.value)
          const awaited = await string
          const promiseRes = raw(awaited, (awaited as HtmlEscapedString).callbacks)
          values.pop()
          return promiseRes
        })
      } else {
        return raw(string)
      }
    },
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(context.Provider as any)[RENDER_TO_DOM] = createContextProviderFunction(values)
  return context
}

export const useContext = <T>(context: Context<T>): T => {
  return context.values.at(-1) as T
}
