import type { Handler } from '../../../dist'
import * as Model from './model'

export const root: Handler = (c) => {
  return c.json({ message: 'Hello' })
}

export const list: Handler = (c) => {
  const posts = Model.getPosts()
  return c.json({ posts: posts, ok: true })
}

export const create: Handler = async (c) => {
  const param = (await c.req.json()) as Model.Param
  const newPost = Model.createPost(param)
  if (!newPost) {
    // Is 200 suitable?
    return c.json({ error: 'Can not create new post', ok: false }, 200)
  }
  return c.json({ post: newPost, ok: true }, 201)
}

export const show: Handler = async (c) => {
  const id = c.req.params('id')
  const post = Model.getPost(id)
  if (!post) {
    return c.json({ error: 'Not Found', ok: false }, 404)
  }
  return c.json({ post: post, ok: true })
}

export const update: Handler = async (c) => {
  const id = c.req.params('id')
  const param = (await c.req.json()) as Model.Param
  if (!Model.getPost(id)) {
    // 204 No Content
    return c.json({ ok: false }, 204)
  }
  const success = Model.updatePost(id, param)
  return c.json({ ok: success })
}

export const destroy: Handler = async (c) => {
  const id = c.req.params('id')
  if (!Model.getPost(id)) {
    // 204 No Content
    return c.json({ ok: false }, 204)
  }
  const success = Model.deletePost(id)
  return c.json({ ok: success })
}
