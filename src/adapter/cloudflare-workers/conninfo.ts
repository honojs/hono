import type { GetConnInfo } from '../../helper/conninfo'

export const getConnInfo: GetConnInfo = (c) => ({
  remote: {
    address: c.req.header('cf-connecting-ip'),
  },
})
