import { Header } from './Header'
import { Footer } from './Footer'

export const Post = (props) => {
  return (
    <div>
      <Header />
      <main>
        <h2>{props.post.title}</h2>
        <p>{props.post.body}</p>
      </main>
      <Footer />
    </div>
  )
}
