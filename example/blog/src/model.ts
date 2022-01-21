declare const BLOG_EXAMPLE: KVNamespace
const PREFIX = 'v1:post:'

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

const generateID = (key: string) => {
  return `${PREFIX}${key}`
}

export const getPosts = async (): Promise<Post[]> => {
  const list = await BLOG_EXAMPLE.list({ prefix: PREFIX })
  const keys = list.keys

  const posts: Post[] = []

  for (const key of keys) {
    const value = await BLOG_EXAMPLE.get(key.name)
    if (!value) continue
    const post: Post = JSON.parse(value)
    posts.push(post)
  }

  return posts
}

export const getPost = async (id: string): Promise<Post | undefined> => {
  const value = await BLOG_EXAMPLE.get(generateID(id))
  if (!value) return
  const post: Post = JSON.parse(value)
  return post
}

export const createPost = async (param: Param): Promise<Post | undefined> => {
  if (!(param.title && param.body)) return
  const id = crypto.randomUUID()
  const newPost: Post = { id: id, title: param.title, body: param.body }
  await BLOG_EXAMPLE.put(generateID(id), JSON.stringify(newPost))
  return newPost
}

export const updatePost = async (id: string, param: Param): Promise<boolean> => {
  if (!(param.title && param.body)) return false
  const post = await getPost(id)
  if (!post) return false
  post.title = param.title
  post.body = param.body
  await BLOG_EXAMPLE.put(generateID(id), JSON.stringify(post))
  return true
}

export const deletePost = async (id: string): Promise<boolean> => {
  const post = await getPost(id)
  if (!post) return false
  await BLOG_EXAMPLE.delete(generateID(id))
  return true
}
