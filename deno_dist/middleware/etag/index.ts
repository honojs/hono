import type { MiddlewareHandler } from '../../types.ts'
import { sha1 } from '../../utils/crypto.ts'

type ETagOptions = {
  weak: boolean
}

export const etag = (options: ETagOptions = { weak: false }): MiddlewareHandler => {
  return async (c, next) => {
    const ifNoneMatch = c.req.header('If-None-Match') || c.req.header('if-none-match')

    await next()

    const res = c.res as Response
    let undisturbedRes = res
    let etag = res.headers.get('ETag')

    if (!etag) {
      undisturbedRes = res.clone()
      const hash = await sha1(res.body || '')
      etag = options.weak ? `W/"${hash}"` : `"${hash}"`
    }

    if (ifNoneMatch && ifNoneMatch === etag) {
      await undisturbedRes.blob() // Force using body
      c.res = new Response(null, {
        status: 304,
        statusText: 'Not Modified',
        headers: {
          ETag: etag,
        },
      })
      c.res.headers.delete('Content-Length')
    } else {
      c.res = new Response(undisturbedRes.body, undisturbedRes)
      c.res.headers.set('ETag', etag)
    }
  }
}
