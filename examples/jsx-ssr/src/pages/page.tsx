import Nano from 'nano-jsx'
import { Helmet } from 'nano-jsx'
import { Header } from '../components/header'
import { Footer } from '../components/footer'
import type { Post } from '../index'

type Props = {
  post: Post
}

export const Page = (props: Props) => {
  return (
    <div>
      <Helmet>
        <title>{props.post.title}</title>
      </Helmet>
      <Header />
      <main>
        <h2>{props.post.title}</h2>
        <p>{props.post.body}</p>
      </main>
      <Footer />
    </div>
  )
}
