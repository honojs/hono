import Nano from 'nano-jsx'
import { Helmet } from 'nano-jsx'
import { Header } from '../components/header'
import { Footer } from '../components/footer'
import type { Post } from '../index'

type Props = {
  posts: Post[]
}

export const Top = (props: Props) => {
  return (
    <div>
      <Helmet>
        <title>Top</title>
      </Helmet>
      <Header />
      <main>
        <h2>Posts</h2>
        {props.posts}
        <ul>
          {props.posts.map((post) => {
            return (
              <li>
                <a href={`/post/${post.id}`}>{post.title}</a>
              </li>
            )
          })}
        </ul>
      </main>
      <Footer />
    </div>
  )
}
