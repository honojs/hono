import { Component } from 'nano-jsx'
import { Link } from './link'

export class App extends Component {
  render() {
    return (
      <div>
        <header>
          <h1>Hello! Hono!</h1>
        </header>
        <main>
          <ul>
            <Link title='Hono GitHub Repositry' url='https://github.com/yusukebe/hono'></Link>
            <Link title='Hono npm Registry' url='https://www.npmjs.com/package/hono'></Link>
          </ul>
        </main>
      </div>
    )
  }
}
