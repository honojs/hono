import { Sunder, Router } from 'sunder'

const sunderRouter = new Router()
sunderRouter.get('/user', (ctx) => {
  ctx.response.body = 'User'
})
sunderRouter.get('/user/comments', (ctx) => {
  ctx.response.body = 'User Comments'
})
sunderRouter.get('/user/avatar', (ctx) => {
  ctx.response.body = 'User Avatar'
})
sunderRouter.get('/user/lookup/email/:address', (ctx) => {
  ctx.response.body = 'User Lookup Email Address'
})
sunderRouter.get('/event/:id', (ctx) => {
  ctx.response.body = 'Event'
})
sunderRouter.get('/event/:id/comments', (ctx) => {
  ctx.response.body = 'Event Comments'
})
sunderRouter.post('/event/:id/comments', (ctx) => {
  ctx.response.body = 'POST Event Comments'
})
sunderRouter.post('/status', (ctx) => {
  ctx.response.body = 'Status'
})
sunderRouter.get('/very/deeply/nested/route/hello/there', (ctx) => {
  ctx.response.body = 'Very Deeply Nested Route'
})
//sunderRouter.get('/static/*', () => {})
sunderRouter.get('/user/lookup/username/:username', (ctx) => {
  ctx.response.body = `Hello ${ctx.params.username}`
})
const sunderApp = new Sunder()
sunderApp.use(sunderRouter.middleware)

addEventListener('fetch', (event) => {
  event.respondWith(sunderApp.handle(event))
})
