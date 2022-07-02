import { opine } from 'https://deno.land/x/opine@2.2.0/mod.ts'

const app = opine()

app.get('/user', () => {})
app.get('/user/comments', () => {})
app.get('/user/avatar', () => {})
app.get('/user/lookup/email/:address', () => {})
app.get('/event/:id', () => {})
app.get('/event/:id/comments', () => {})
app.post('/event/:id/comments', () => {})
app.post('/status', () => {})
app.get('/very/deeply/nested/route/hello/there', () => {})
app.get('/user/lookup/username/:username', (req, res) => {
  res.send({ message: `Hello ${req.params.username}` })
})

app.listen(8000)
