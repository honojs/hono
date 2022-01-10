import { app } from './index'
import type { Post } from './model'

describe('Root', () => {
  it('GET /', async () => {
    const req = new Request('http://localhost/')
    const res = await app.dispatch(req)
    expect(res.status).toBe(200)
    const body = (await res.json()) as any
    expect(body['message']).toBe('Hello')
  })
})

describe('Blog API', () => {
  it('List', async () => {
    const req = new Request('http://localhost/posts')
    const res = await app.dispatch(req)
    expect(res.status).toBe(200)
    const body = (await res.json()) as any
    expect(body['posts']).not.toBeUndefined()
    expect(body['posts'].length).toBe(0)
  })

  it('CRUD', async () => {
    let payload = JSON.stringify({ title: 'Morning', body: 'Good Morning' })
    let req = new Request('http://localhost/posts', { method: 'POST', body: payload })
    let res = await app.dispatch(req)
    expect(res.status).toBe(201)
    let body = (await res.json()) as any
    const newPost = body['post'] as Post
    expect(newPost.title).toBe('Morning')
    expect(newPost.body).toBe('Good Morning')

    req = new Request('https://localhost/posts')
    res = await app.dispatch(req)
    expect(res.status).toBe(200)
    body = (await res.json()) as any
    expect(body['posts'].length).toBe(1)

    req = new Request(`https://localhost/posts/${newPost.id}`)
    res = await app.dispatch(req)
    expect(res.status).toBe(200)
    body = (await res.json()) as any
    let post = body['post'] as Post
    expect(post.id).toBe(newPost.id)
    expect(post.title).toBe('Morning')

    payload = JSON.stringify({ title: 'Night', body: 'Good Night' })
    req = new Request(`https://localhost/posts/${post.id}`, {
      method: 'PUT',
      body: payload,
    })
    res = await app.dispatch(req)
    expect(res.status).toBe(200)
    body = (await res.json()) as any
    expect(body['ok']).toBeTruthy()

    req = new Request(`https://localhost/posts/${post.id}`)
    res = await app.dispatch(req)
    expect(res.status).toBe(200)
    body = (await res.json()) as any
    post = body['post'] as Post
    expect(post.title).toBe('Night')
    expect(post.body).toBe('Good Night')

    req = new Request(`https://localhost/posts/${post.id}`, { method: 'DELETE' })
    res = await app.dispatch(req)
    expect(res.status).toBe(200)
    body = (await res.json()) as any
    expect(body['ok']).toBeTruthy()

    req = new Request(`https://localhost/posts/${post.id}`)
    res = await app.dispatch(req)
    expect(res.status).toBe(404)
  })
})
