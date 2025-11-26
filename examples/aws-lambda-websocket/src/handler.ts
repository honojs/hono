import { handle } from 'hono/aws-lambda'
import { createApp } from './app'

// For AWS Lambda, we don't need to inject the upgradeWebSocket middleware
// because API Gateway handles the WebSocket connection and events are passed to the Lambda function.
// However, standard Hono WebSocket helper is designed for runtime that supports WebSocket upgrade (like Node.js, Deno, Bun, Cloudflare Workers).
// AWS Lambda + API Gateway WebSocket works differently (connect, disconnect, message events).

const app = createApp()

export const handler = handle(app)

// Note: To fully support WebSockets on AWS Lambda with API Gateway,
// you typically need to handle $connect, $disconnect, and $default routes.
// Hono's `upgradeWebSocket` is not directly compatible with API Gateway's WebSocket API
// because API Gateway doesn't "upgrade" a single HTTP request to a WebSocket connection in the same way.
// Instead, it invokes the Lambda for each event.
//
// If you want to use Hono to handle the WebSocket events from API Gateway,
// you would define routes for the specific event keys (e.g., routeKey).
//
// Example for API Gateway WebSocket:
// app.post('$connect', (c) => { ... })
// app.post('$disconnect', (c) => { ... })
// app.post('$default', (c) => { ... })
