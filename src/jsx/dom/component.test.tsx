/** @jsxImportSource ../ */
import { JSDOM } from 'jsdom'
import { Component } from '../component'
import { render, useState } from '.'

describe('Component', () => {
  beforeAll(() => {
    global.requestAnimationFrame = (cb) => setTimeout(cb)
  })

  let dom: JSDOM
  let root: HTMLElement
  beforeEach(() => {
    dom = new JSDOM('<html><body><div id="root"></div></body></html>', {
      runScripts: 'dangerously',
    })
    global.document = dom.window.document
    global.HTMLElement = dom.window.HTMLElement
    global.Text = dom.window.Text
    root = document.getElementById('root') as HTMLElement
  })

  it('render component', async () => {
    class App extends Component {
      render() {
        return <div>Hello</div>
      }
    }
    render(<App />, root)
    expect(root.innerHTML).toBe('<div>Hello</div>')
  })

  it('update props', async () => {
    class C extends Component {
      render() {
        return <div>{this.props.count}</div>
      }
    }
    const App = () => {
      const [count, setCount] = useState(0)
      return <>
        <button onClick={() => setCount(count + 1)}>+</button>
        <C count={count} />
      </>
    }
    render(<App />, root)
    expect(root.innerHTML).toBe('<button>+</button><div>0</div>')
    root.querySelector('button')!.click()
    await Promise.resolve()
    expect(root.innerHTML).toBe('<button>+</button><div>1</div>')
  })
})
