declare global {
  interface Crypto {
    randomUUID(): string
  }
}

export interface Post {
  id: string
  title: string
  body: string
}

export type Param = {
  title: string
  body: string
}

const posts: { [key: string]: Post } = {}

export const getPosts = (): Post[] => {
  return Object.values(posts)
}

export const getPost = (id: string): Post | undefined => {
  return posts[id]
}

export const createPost = (param: Param): Post | undefined => {
  if (!(param.title && param.body)) return
  const id = crypto.randomUUID()
  const newPost: Post = { id: id, title: param.title, body: param.body }
  posts[id] = newPost
  return newPost
}

export const updatePost = (id: string, param: Param): boolean => {
  if (!(param.title && param.body)) return false
  const post = posts[id]
  if (post) {
    post.title = param.title
    post.body = param.body
    return true
  }
  return false
}

export const deletePost = (id: string): boolean => {
  if (posts[id]) {
    delete posts[id]
    return true
  }
  return false
}
