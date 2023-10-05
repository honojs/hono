import type { Context, Renderer } from '../../context'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { jsx, createContext, useContext } from '../../jsx'
import type { FC, JSXNode } from '../../jsx'
import type { Env, Input, MiddlewareHandler } from '../../types'

export const RequestContext = createContext<Context | null>(null)

type PropsForRenderer = [...Parameters<Renderer>] extends [unknown, infer Props] ? Props : unknown

const createRenderer =
  (c: Context, component?: FC<PropsForRenderer>) => (children: JSXNode, props: PropsForRenderer) =>
    /* eslint-disable @typescript-eslint/no-explicit-any */
    c.html(
      jsx(
        RequestContext.Provider,
        { value: c },
        (component ? component({ children, ...(props || {}) }) : children) as any
      ) as any
    )

export const jsxRenderer =
  (component?: FC<PropsForRenderer>): MiddlewareHandler =>
  (c, next) => {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    c.setRenderer(createRenderer(c, component) as any)
    return next()
  }

export const useRequestContext = <
  E extends Env = any,
  P extends string = any,
  I extends Input = {}
>(): Context<E, P, I> => {
  const c = useContext(RequestContext)
  if (!c) {
    throw new Error('RequestContext is not provided.')
  }
  return c
}
