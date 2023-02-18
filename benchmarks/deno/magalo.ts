import { Megalo } from 'https://deno.land/x/megalo@v0.3.0/mod.ts'

const app = new Megalo()

app.get('/user', () => {})
app.get('/user/comments', () => {})
app.get('/user/avatar', () => {})
app.get('/user/lookup/email/:address', () => {})
app.get('/event/:id', () => {})
app.get('/event/:id/comments', () => {})
app.post('/event/:id/comments', () => {})
app.post('/status', () => {})
app.get('/very/deeply/nested/route/hello/there', () => {})
app.get('/user/lookup/username/:username', ({ params }, res) => {
  res.json({
    message: `Hello ${params.username}`,
  })
})

app.listen({ port: 8000 })
