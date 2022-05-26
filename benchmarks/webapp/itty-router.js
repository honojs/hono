import { Router } from 'itty-router'

const ittyRouter = Router()
ittyRouter.get('/user', () => new Response('User'))
ittyRouter.get('/user/comments', () => new Response('User Comments'))
ittyRouter.get('/user/avatar', () => new Response('User Avatar'))
ittyRouter.get('/user/lookup/email/:address', () => new Response('User Lookup Email Address'))
ittyRouter.get('/event/:id', () => new Response('Event'))
ittyRouter.get('/event/:id/comments', () => new Response('Event Comments'))
ittyRouter.post('/event/:id/comments', () => new Response('POST Event Comments'))
ittyRouter.post('/status', () => new Response('Status'))
ittyRouter.get(
  '/very/deeply/nested/route/hello/there',
  () => new Response('Very Deeply Nested Route')
)
ittyRouter.get('/user/lookup/username/:username', ({ params }) => {
  return new Response(`Hello ${params.username}`, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain;charset=UTF-8',
    },
  })
})

addEventListener('fetch', (event) => event.respondWith(ittyRouter.handle(event.request)))
