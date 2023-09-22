import { type Context } from './context'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { jsx, createContext, useContext, type JSXNode, type FC } from './jsx'

export const RequestContext = createContext<Context | null>(null)

export const createRenderer =
  <T extends Function>(c: Context, component?: T) =>
  /* eslint-disable @typescript-eslint/no-explicit-any */
  (...args: any[]) =>
    c.html(
      <RequestContext.Provider value={c}>
        {component ? component(...args) : args}
      </RequestContext.Provider>
    )

export const useRequestContext = (): Context => {
  const c = useContext(RequestContext)
  if (!c) {
    throw new Error('RequestContext is not provided.')
  }
  return c
}
