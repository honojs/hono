import { Application, Router } from 'https://deno.land/x/oak@v10.5.1/mod.ts'

const router = new Router()

router.get('/user', () => {})
router.get('/user/comments', () => {})
router.get('/user/avatar', () => {})
router.get('/user/lookup/email/:address', () => {})
router.get('/event/:id', () => {})
router.get('/event/:id/comments', () => {})
router.post('/event/:id/comments', () => {})
router.post('/status', () => {})
router.get('/very/deeply/nested/route/hello/there', () => {})
router.get('/user/lookup/username/:username', (ctx) => {
  ctx.response.body = {
    message: `Hello ${ctx.params.username}`,
  }
})

const app = new Application()
app.use(router.routes())
app.use(router.allowedMethods())

await app.listen({ port: 8000 })
