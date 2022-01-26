import type { Context } from '../context'

export const defaultMiddleware = async (c: Context, next: Function) => {
  c.req.query = (key: string) => {
    // eslint-disable-next-line
    const url = new URL(c.req.url)
    return url.searchParams.get(key)
  }
  c.req.header = (name: string): string => {
    return c.req.headers.get(name)
  }

  await next()
}
