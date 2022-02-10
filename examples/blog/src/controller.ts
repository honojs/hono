import type { Context, Handler } from 'hono'
import * as Model from './model'

export const root: Handler = (c: Context) => {
  return c.json({ message: 'Hello' })
}

export const list: Handler = async (c: Context) => {
  const posts = await Model.getPosts()
  return c.json({ posts: posts, ok: true })
}

export const create: Handler = async (c: Context) => {
  let newPost: Model.Post | undefined
  if (c.req.parsedBody) {
    const param = c.req.parsedBody as Model.Param
    newPost = await Model.createPost(param)
  }
  if (!newPost) {
    // Is 200 suitable?
    return c.json({ error: 'Can not create new post', ok: false }, 200)
  }
  return c.json({ post: newPost, ok: true }, 201)
}

export const show: Handler = async (c: Context) => {
  const id = c.req.param('id')
  const post = await Model.getPost(id)
  if (!post) {
    return c.json({ error: 'Not Found', ok: false }, 404)
  }
  return c.json({ post: post, ok: true })
}

export const update: Handler = async (c: Context) => {
  const id = c.req.param('id')
  if (!(await Model.getPost(id))) {
    // 204 No Content
    return c.json({ ok: false }, 204)
  }
  const param = c.req.parsedBody as Model.Param
  const success = await Model.updatePost(id, param)
  return c.json({ ok: success })
}

export const destroy: Handler = async (c: Context) => {
  const id = c.req.param('id')
  if (!(await Model.getPost(id))) {
    // 204 No Content
    return c.json({ ok: false }, 204)
  }
  const success = await Model.deletePost(id)
  return c.json({ ok: success })
}
