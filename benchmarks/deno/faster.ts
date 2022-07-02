import { res, Server } from 'https://deno.land/x/faster@v5.7/mod.ts'
const app = new Server()

app.get('/user', () => {})
app.get('/user/comments', () => {})
app.get('/user/avatar', () => {})
app.get('/user/lookup/email/:address', () => {})
app.get('/event/:id', () => {})
app.get('/event/:id/comments', () => {})
app.post('/event/:id/comments', () => {})
app.post('/status', () => {})
app.get('/very/deeply/nested/route/hello/there', () => {})
app.get('/user/lookup/username/:username', res('json'), async (ctx: any, next: any) => {
  ctx.res.body = { message: `Hello ${ctx.params.username}` }
  await next()
})

await app.listen({ port: 8000 })
