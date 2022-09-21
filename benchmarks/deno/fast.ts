import fast, { type Context } from 'https://deno.land/x/fast@4.0.0-beta.1/mod.ts'

const app = fast()

app.get('/user', () => {})
app.get('/user/comments', () => {})
app.get('/user/avatar', () => {})
app.get('/user/lookup/email/:address', () => {})
app.get('/event/:id', () => {})
app.get('/event/:id/comments', () => {})
app.post('/event/:id/comments', () => {})
app.post('/status', () => {})
app.get('/very/deeply/nested/route/hello/there', () => {})
app.get('/user/lookup/username/:username', (ctx: Context) => {
  return { message: `Hello ${ctx.params.username}` }
})

await app.serve({
  port: 8000,
})
