# Hono AWS Lambda WebSocket Example

This example demonstrates how to structure a Hono application that supports WebSockets and can be deployed to AWS Lambda, while also being runnable locally with Node.js.

## Structure

- `src/app.ts`: The main application logic. It exports a factory function `createApp` that accepts an optional `upgradeWebSocket` middleware. This allows us to inject the WebSocket logic only when running in an environment that supports it via `upgradeWebSocket` (like Node.js).
- `src/index.ts`: The entry point for local development using Node.js. It uses `@hono/node-ws` to provide WebSocket support.
- `src/handler.ts`: The entry point for AWS Lambda.

## Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the development server:
   ```bash
   npm run dev
   ```

3. Open `http://localhost:3000` in your browser or use a WebSocket client to connect to `ws://localhost:3000/ws`.

## AWS Lambda Deployment

To deploy to AWS Lambda, you will typically use a tool like AWS CDK, Serverless Framework, or SAM.

The `src/handler.ts` file exports the Lambda handler.

### Note on WebSockets in AWS Lambda

AWS Lambda + API Gateway WebSockets work differently than standard HTTP upgrades. API Gateway maintains the persistent connection and invokes your Lambda function for each event (`$connect`, `$disconnect`, `$default`, etc.).

The `upgradeWebSocket` helper used in `src/index.ts` is for runtimes where the application handles the WebSocket upgrade directly. For AWS Lambda, you would typically handle the specific route keys configured in API Gateway.

This example shows how to keep the code structure compatible, but for full WebSocket functionality on Lambda, you would add routes to handle the API Gateway events in `src/app.ts` or a separate handler, potentially checking for the execution environment.
