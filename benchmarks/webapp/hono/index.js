const { Hono } = require('../../../dist/index')

const hono = new Hono()
hono.get('/user', () => new Response('User'))
hono.get('/user/comments', () => new Response('User Comments'))
hono.get('/user/avatar', () => new Response('User Avatar'))
hono.get('/user/lookup/username/:username', () => new Response('User Lookup Username'))
hono.get('/user/lookup/email/:address', () => new Response('User Lookup Email Address'))
hono.get('/event/:id', () => new Response('Event'))
hono.get('/event/:id/comments', () => new Response('Event Comments'))
hono.post('/event/:id/comments', () => new Response('POST Event Comments'))
hono.post('/status', () => new Response('Status'))
hono.get('/very/deeply/nested/route/hello/there', () => new Response('Very Deeply Nested Route'))
//hono.get('/static/*', () => new Response('Static'))
hono.get('/user/lookup/username/:username', (c) => {
  return c.newResponse(`Hello ${c.req.params('username')}`, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain;charset=UTF-8',
    },
  })
})

hono.fire()
