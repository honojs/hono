// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import type { Context } from 'https://edge.netlify.com/'
import type { Hono } from '../../hono.ts'

export type Env = {
  Bindings: {
    context: Context
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const handle = (app: Hono<any, any>) => {
  return (req: Request, context: Context) => {
    return app.fetch(req, { context })
  }
}
