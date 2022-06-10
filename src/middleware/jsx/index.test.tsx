import { Hono } from '../../hono'
import { h, jsx } from '.'

describe('JSX middleware', () => {
  const app = new Hono()
  app.use('*', jsx())

  it('Should render HTML strings', async () => {
    app.get('/', (c) => {
      return c.render(<h1>Hello</h1>)
    })
    const res = await app.request('http://localhost/')
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('text/html; charset=UTF-8')
    expect(await res.text()).toBe('<!doctype html><h1>Hello</h1>')
  })
})

describe('render to string', () => {
  it('Nested array', () => {
    const template = (
      <p>
        {[[['a']], [['b']]].map((item1) =>
          item1.map((item2) => item2.map((item3) => <span>{item3}</span>))
        )}
      </p>
    )
    expect(template.toString()).toBe('<p><span>a</span><span>b</span></p>')
  })

  it('Props value is null', () => {
    const template = <span data-hello={null}>Hello</span>
    expect(template.toString()).toBe('<span>Hello</span>')
  })

  it('Props value is undefined', () => {
    const template = <span data-hello={undefined}>Hello</span>
    expect(template.toString()).toBe('<span>Hello</span>')
  })

  // https://en.reactjs.org/docs/jsx-in-depth.html#booleans-null-and-undefined-are-ignored
  describe('Booleans, Null, and Undefined Are Ignored', () => {
    it.each([true, false, undefined, null])('%s', (item) => {
      expect((<span>{item}</span>).toString()).toBe('<span></span>')
    })

    it('falsy value', () => {
      const template = <span>{0}</span>
      expect(template.toString()).toBe('<span>0</span>')
    })
  })

  // https://en.reactjs.org/docs/jsx-in-depth.html#props-default-to-true
  describe('Props Default to “True”', () => {
    it('default prop value', () => {
      const template = <span data-hello>Hello</span>
      expect(template.toString()).toBe('<span data-hello="true">Hello</span>')
    })
  })

  // https://en.reactjs.org/docs/jsx-in-depth.html#functions-as-children
  describe('Functions as Children', () => {
    it('Function', () => {
      function Repeat(props: any) {
        const items = []
        for (let i = 0; i < props.numTimes; i++) {
          items.push((props.children as Function)(i))
        }
        return <div>{items}</div>
      }

      function ListOfTenThings() {
        return (
          <Repeat numTimes={10}>
            {(index: string) => <div key={index}>This is item {index} in the list</div>}
          </Repeat>
        )
      }

      const template = <ListOfTenThings />
      expect(template.toString()).toBe(
        '<div><div key="0">This is item 0 in the list</div><div key="1">This is item 1 in the list</div><div key="2">This is item 2 in the list</div><div key="3">This is item 3 in the list</div><div key="4">This is item 4 in the list</div><div key="5">This is item 5 in the list</div><div key="6">This is item 6 in the list</div><div key="7">This is item 7 in the list</div><div key="8">This is item 8 in the list</div><div key="9">This is item 9 in the list</div></div>'
      )
    })
  })
})
