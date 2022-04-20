import { sha1 } from '@/utils/crypto'
import { parseBody } from '@/utils/body'
import type { Context } from '@/context'

type ETagOptions = {
  weak: boolean
}

export const etag = (options: ETagOptions = { weak: false }) => {
  return async (c: Context, next: Function) => {
    const ifNoneMatch = c.req.header('If-None-Match') || c.req.header('if-none-match')

    await next()

    const clone = c.res.clone()
    const body = await parseBody(c.res)
    const hash = await sha1(body)

    const etag = options.weak ? `W/"${hash}"` : `"${hash}"`

    if (ifNoneMatch && ifNoneMatch === etag) {
      await clone.blob() // Force using body
      c.res = new Response(null, {
        status: 304,
        statusText: 'Not Modified',
      })
      c.res.headers.delete('Content-Length')
    } else {
      c.res = new Response(clone.body, clone)
      c.res.headers.append('ETag', etag)
    }
  }
}
