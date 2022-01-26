import { Hono } from '../../../dist/index'
import Nano from 'nano-jsx'
import { Post } from './Post'
import { Top } from './Top'

const app = new Hono()

// View
const makeHTML = (body) => {
  return `
<!DOCTYPE html>
 <html>
  <body>
    ${body}
  </body>
</html>
`
}

// Model
const posts = [
  { id: '1', title: 'Good Morning', body: 'Let us eat breakfast' },
  { id: '2', title: 'Good Afternoon', body: 'Let us eat Lunch' },
  { id: '3', title: 'Good Evening', body: 'Let us eat Dinner' },
  { id: '4', title: 'Good Night', body: 'Let us drink Beer' },
  { id: '5', title: 'こんにちは', body: '昼からビールを飲みます' },
]

// Logic
const getPosts = () => {
  return posts
}

const getPost = (id) => {
  for (const post of posts) {
    if (post.id === id) {
      return post
    }
  }
}

// Controller
app.get('/', (c) => {
  const posts = getPosts()
  const body = Nano.renderSSR(<Top posts={posts} />)
  const html = makeHTML(body)
  return c.html(html)
})

app.get('/post/:id{[0-9]+}', (c) => {
  const id = c.req.param('id')
  const post = getPost(id)
  if (!post) {
    return c.text('Not Found', 404)
  }
  const body = Nano.renderSSR(<Post post={post} />)
  const html = makeHTML(body)
  return c.html(html)
})

app.fire()
