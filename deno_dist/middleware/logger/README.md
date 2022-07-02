# Logger Middleware

## Usage

index.js:

```js
import { Hono } from 'hono'
import { logger } from 'hono/logger'

export const app = new Hono()

app.use('*', logger())
app.get('/', (c) => c.text('Hello Hono!'))

app.fire()
```
