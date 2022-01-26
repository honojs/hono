import { Hono } from '../../../dist'
import { getAssetFromKV } from '@cloudflare/kv-asset-handler'

const hono = new Hono()

hono.get('/', (c) => c.text('This is Home! You can access: /static/hello.txt'))

hono.all('/static/*', async (c) => {
  try {
    return await getAssetFromKV(c.event)
  } catch (e) {
    return c.newResponse('Asset Not Found', {
      status: 404,
    })
  }
})

hono.fire()
