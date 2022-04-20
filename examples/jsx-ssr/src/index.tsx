import { Hono } from 'hono'
import Nano from 'nano-jsx'
import { Page } from './pages/page'
import { Top } from './pages/top'
import { render } from './renderer'

const app = new Hono()

// Model
export type Post = {
  id: string
  title: string
  body: string
}

const posts: Post[] = [
  { id: '1', title: 'Good Morning', body: 'Let us eat breakfast' },
  { id: '2', title: 'Good Afternoon', body: 'Let us eat Lunch' },
  { id: '3', title: 'Good Evening', body: 'Let us eat Dinner' },
  { id: '4', title: 'Good Night', body: 'Let us drink Beer' },
  { id: '5', title: 'こんにちは', body: '昼からビールを飲みます' },
]

// Logic
const getPosts = () => posts

const getPost = (id: string) => {
  return posts.find((post) => post.id == id)
}

// Controller
app.get('/', (c) => {
  const posts = getPosts()
  const html = render(<Top posts={posts} />)
  return c.html(html)
})

app.get('/post/:id{[0-9]+}', (c) => {
  const id = c.req.param('id')
  const post = getPost(id)
  if (!post) return c.notFound()
  const html = render(<Page post={post} />)
  return c.html(html)
})

app.fire()
