import { serve } from '@hono/node-server'
import { createNodeWebSocket } from '@hono/node-ws'
import { createApp } from './app'

const app = createApp()

const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app })

// Re-create the app with the upgradeWebSocket middleware injected
const appWithWebSocket = createApp(upgradeWebSocket)

const server = serve({
    fetch: appWithWebSocket.fetch,
    port: 3000,
})

injectWebSocket(server)

console.log('Server is running on http://localhost:3000')
