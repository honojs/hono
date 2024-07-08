import type { GetConnInfo } from '../../helper/conninfo'

export const getConnInfo: GetConnInfo = (c) => ({
  remote: {
    // https://github.com/vercel/vercel/blob/b70bfb5fbf28a4650d4042ce68ca5c636d37cf44/packages/edge/src/edge-headers.ts#L10-L12C32
    address: c.req.header('x-real-ip'),
  },
})
