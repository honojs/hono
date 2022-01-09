import { Header } from './Header'
import { Footer } from './Footer'

export const Top = (props) => {
  return (
    <div>
      <Header />
      <main>
        <h2>Posts</h2>
        {props.posts}
        <ul>
          {props.posts.map((post) => {
            return <li><a href={`/post/${post.id}`}>{post.title}</a></li>
          })}
        </ul>
      </main>
      <Footer />
    </div>
  )
}
