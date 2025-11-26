import { Hono } from 'hono'
import { createNodeWebSocket } from '@hono/node-ws'

// Define a factory function to create the app
// This allows us to inject the `upgradeWebSocket` middleware
// which is different for Node.js and AWS Lambda (or rather, AWS Lambda doesn't use it the same way)
export const createApp = (
  upgradeWebSocket?: (
    createEvents: (c: any) => any
  ) => any
) => {
  const app = new Hono()

  app.get('/', (c) => c.text('Hello Hono!'))

  if (upgradeWebSocket) {
    app.get(
      '/ws',
      upgradeWebSocket((c) => {
        return {
          onOpen(event, ws) {
            console.log('Connection opened')
          },
          onMessage(event, ws) {
            console.log(`Message received: ${event.data}`)
            ws.send(`Hello from Hono! You said: ${event.data}`)
          },
          onClose(event, ws) {
            console.log('Connection closed')
          },
        }
      })
    )
  }

  return app
}
