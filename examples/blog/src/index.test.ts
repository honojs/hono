import type { Post } from './model'
import { app } from './index'

describe('Root', () => {
  it('GET /', async () => {
    const res = await app.request('http://localhost/')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body['message']).toBe('Hello')
  })
})

describe('Blog API', () => {
  it('List', async () => {
    const res = await app.request('http://localhost/posts')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body['posts']).not.toBeUndefined()
    expect(body['posts'].length).toBe(0)
  })

  it('CRUD', async () => {
    let payload = JSON.stringify({ title: 'Morning', body: 'Good Morning' })
    let req = new Request('http://localhost/posts', {
      method: 'POST',
      body: payload,
      headers: { 'Content-Type': 'application/json' },
    })
    let res = await app.request(req)
    expect(res.status).toBe(201)
    let body = await res.json()
    const newPost = body['post'] as Post
    expect(newPost.title).toBe('Morning')
    expect(newPost.body).toBe('Good Morning')

    res = await app.request('https://localhost/posts')
    expect(res.status).toBe(200)
    body = await res.json()
    expect(body['posts']).not.toBeUndefined()
    expect(body['posts'].length).toBe(1)

    res = await app.request(`https://localhost/posts/${newPost.id}`)
    expect(res.status).toBe(200)
    body = await res.json()
    let post = body['post'] as Post
    expect(post.id).toBe(newPost.id)
    expect(post.title).toBe('Morning')
    const postId = post.id

    payload = JSON.stringify({ title: 'Night', body: 'Good Night' })
    req = new Request(`https://localhost/posts/${postId}`, {
      method: 'PUT',
      body: payload,
      headers: { 'Content-Type': 'application/json' },
    })
    res = await app.request(req)
    expect(res.status).toBe(200)
    body = await res.json()
    expect(body['ok']).toBeTruthy()

    res = await app.request(`https://localhost/posts/${postId}`)
    expect(res.status).toBe(200)
    body = await res.json()
    post = body['post'] as Post
    expect(post.title).toBe('Night')
    expect(post.body).toBe('Good Night')

    req = new Request(`https://localhost/posts/${postId}`, {
      method: 'DELETE',
    })
    res = await app.request(req)
    expect(res.status).toBe(200)
    body = await res.json()
    expect(body['ok']).toBeTruthy()

    res = await app.request(`https://localhost/posts/${postId}`)
    expect(res.status).toBe(404)
  })
})
