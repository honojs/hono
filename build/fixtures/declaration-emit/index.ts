import { Hono } from 'hono'
import { createFactory } from 'hono/factory'
import { testClient } from 'hono/testing'

// Inferred types like these mention internal aliases from hono's declarations
// (for example the return type of `c.json()`). Consumers that build with
// `declaration: true` must be able to emit them without naming those aliases.
export const handlers = createFactory().createHandlers((c) => c.json({ ok: true }))

export const app = new Hono().get('/', (c) => c.json({ ok: true }))
export type AppType = typeof app

// `testClient()` returns a client whose members are `ClientRequest` from `hono/client`.
// It must stay nameable even though this file never imports `hono/client`.
export const client = testClient(app)
