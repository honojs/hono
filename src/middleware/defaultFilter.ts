import { Context } from '../hono'

export const defaultFilter = async (c: Context, next: Function) => {
  c.req.query = (key: string) => {
    const url = new URL(c.req.url)
    return url.searchParams.get(key)
  }

  await next()
}
