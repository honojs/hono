import { Hono } from '../../hono'
import { html } from '../html/index'
import { jsx, memo, Fragment } from './index'

interface SiteData {
  title: string
  children?: any
}

describe('JSX middleware', () => {
  let app: Hono

  beforeEach(() => {
    app = new Hono()
  })

  it('Should render HTML strings', async () => {
    app.get('/', (c) => {
      return c.html(<h1>Hello</h1>)
    })
    const res = await app.request('http://localhost/')
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('text/html; charset=UTF-8')
    expect(await res.text()).toBe('<h1>Hello</h1>')
  })

  it('Should be able to be used with html middleware', async () => {
    const Layout = (props: SiteData) => html`<!DOCTYPE html>
      <html>
        <head>
          <title>${props.title}</title>
        </head>
        <body>
          ${props.children}
        </body>
      </html>`

    const Content = (props: { siteData: SiteData; name: string }) => (
      <Layout {...props.siteData}>
        <h1>{props.name}</h1>
      </Layout>
    )

    app.get('/', (c) => {
      const props = {
        name: 'JSX',
        siteData: {
          title: 'with html middleware',
        },
      }
      return c.html(<Content {...props} />)
    })
    const res = await app.request('http://localhost/')
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('text/html; charset=UTF-8')
    expect(await res.text()).toBe(`<!DOCTYPE html>
      <html>
        <head>
          <title>with html middleware</title>
        </head>
        <body>
          <h1>JSX</h1>
        </body>
      </html>`)
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

  it('Empty elements are rended withtout closing tag', () => {
    const template = <input />
    expect(template.toString()).toBe('<input/>')
  })

  it('Props value is null', () => {
    const template = <span data-hello={null}>Hello</span>
    expect(template.toString()).toBe('<span>Hello</span>')
  })

  it('Props value is undefined', () => {
    const template = <span data-hello={undefined}>Hello</span>
    expect(template.toString()).toBe('<span>Hello</span>')
  })

  describe('dangerouslySetInnerHTML', () => {
    it('Should render dangerouslySetInnerHTML', () => {
      const template = <span dangerouslySetInnerHTML={{ __html: '" is allowed here' }}></span>
      expect(template.toString()).toBe('<span>" is allowed here</span>')
    })

    it('Should get an error if both dangerouslySetInnerHTML and children are specified', () => {
      expect(() =>
        (<span dangerouslySetInnerHTML={{ __html: '" is allowed here' }}>Hello</span>).toString()
      ).toThrow()
    })
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

  // https://html.spec.whatwg.org/#attributes-3
  describe('Boolean attribute', () => {
    it('default prop value for checked', () => {
      const template = <input type='checkbox' checked />
      expect(template.toString()).toBe('<input type="checkbox" checked=""/>')
    })

    it('default prop value for checked={true}', () => {
      const template = <input type='checkbox' checked={true} />
      expect(template.toString()).toBe('<input type="checkbox" checked=""/>')
    })

    it('no prop for checked={false}', () => {
      const template = <input type='checkbox' checked={false} />
      expect(template.toString()).toBe('<input type="checkbox"/>')
    })

    it('default prop value for disabled', () => {
      const template = <input type='checkbox' disabled />
      expect(template.toString()).toBe('<input type="checkbox" disabled=""/>')
    })

    it('default prop value for disabled={true}', () => {
      const template = <input type='checkbox' disabled={true} />
      expect(template.toString()).toBe('<input type="checkbox" disabled=""/>')
    })

    it('no prop for disabled={false}', () => {
      const template = <input type='checkbox' disabled={false} />
      expect(template.toString()).toBe('<input type="checkbox"/>')
    })

    it('default prop value for readonly', () => {
      const template = <input type='checkbox' readonly />
      expect(template.toString()).toBe('<input type="checkbox" readonly=""/>')
    })

    it('default prop value for readonly={true}', () => {
      const template = <input type='checkbox' readonly={true} />
      expect(template.toString()).toBe('<input type="checkbox" readonly=""/>')
    })

    it('no prop for readonly={false}', () => {
      const template = <input type='checkbox' readonly={false} />
      expect(template.toString()).toBe('<input type="checkbox"/>')
    })

    it('default prop value for selected', () => {
      const template = (
        <option value='test' selected>
          Test
        </option>
      )
      expect(template.toString()).toBe('<option value="test" selected="">Test</option>')
    })

    it('default prop value for selected={true}', () => {
      const template = (
        <option value='test' selected={true}>
          Test
        </option>
      )
      expect(template.toString()).toBe('<option value="test" selected="">Test</option>')
    })

    it('no prop for selected={false}', () => {
      const template = (
        <option value='test' selected={false}>
          Test
        </option>
      )
      expect(template.toString()).toBe('<option value="test">Test</option>')
    })

    it('default prop value for multiple select', () => {
      const template = (
        <select multiple>
          <option>test</option>
        </select>
      )
      expect(template.toString()).toBe('<select multiple=""><option>test</option></select>')
    })

    it('default prop value for select multiple={true}', () => {
      const template = (
        <select multiple={true}>
          <option>test</option>
        </select>
      )
      expect(template.toString()).toBe('<select multiple=""><option>test</option></select>')
    })

    it('no prop for select multiple={false}', () => {
      const template = (
        <select multiple={false}>
          <option>test</option>
        </select>
      )
      expect(template.toString()).toBe('<select><option>test</option></select>')
    })

    it('should render "false" value properly for other non-defined keys', () => {
      const template = <input type='checkbox' testkey={false} />
      expect(template.toString()).toBe('<input type="checkbox" testkey="false"/>')
    })

    it('should support attributes for elements other than input', () => {
      const template = (
        <video controls autoplay>
          <source src='movie.mp4' type='video/mp4' />
        </video>
      )
      expect(template.toString()).toBe(
        '<video controls="" autoplay=""><source src="movie.mp4" type="video/mp4"/></video>'
      )
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

  describe('style attribute', () => {
    it('should convert the object to strings', () => {
      const template = (
        <h1
          style={{
            color: 'red',
            fontSize: 'small',
          }}
        >
          Hello
        </h1>
      )
      expect(template.toString()).toBe('<h1 style="color:red;font-size:small">Hello</h1>')
    })
    it('should not convert the strings', () => {
      const template = <h1 style='color:red;font-size:small'>Hello</h1>
      expect(template.toString()).toBe('<h1 style="color:red;font-size:small">Hello</h1>')
    })
  })
})

describe('memo', () => {
  it('memoized', () => {
    let counter = 0
    const Header = memo(() => <title>Test Site {counter}</title>)
    const Body = () => <span>{counter}</span>

    let template = (
      <html>
        <head>
          <Header />
        </head>
        <body>
          <Body />
        </body>
      </html>
    )
    expect(template.toString()).toBe(
      '<html><head><title>Test Site 0</title></head><body><span>0</span></body></html>'
    )

    counter++
    template = (
      <html>
        <head>
          <Header />
        </head>
        <body>
          <Body />
        </body>
      </html>
    )
    expect(template.toString()).toBe(
      '<html><head><title>Test Site 0</title></head><body><span>1</span></body></html>'
    )
  })

  it('props are updated', () => {
    const Body = memo(({ counter }: { counter: number }) => <span>{counter}</span>)

    let template = <Body counter={0} />
    expect(template.toString()).toBe('<span>0</span>')

    template = <Body counter={1} />
    expect(template.toString()).toBe('<span>1</span>')
  })

  it('custom propsAreEqual', () => {
    const Body = memo(
      ({ counter }: { counter: number; refresh?: boolean }) => <span>{counter}</span>,
      (_, nextProps) => (typeof nextProps.refresh == 'undefined' ? true : !nextProps.refresh)
    )

    let template = <Body counter={0} />
    expect(template.toString()).toBe('<span>0</span>')

    template = <Body counter={1} />
    expect(template.toString()).toBe('<span>0</span>')

    template = <Body counter={2} refresh={true} />
    expect(template.toString()).toBe('<span>2</span>')
  })
})

describe('Fragment', () => {
  it('Should render children', () => {
    const template = (
      <>
        <p>1</p>
        <p>2</p>
      </>
    )
    expect(template.toString()).toBe('<p>1</p><p>2</p>')
  })

  it('Should render nothing for empty Fragment', () => {
    const template = <></>
    expect(template.toString()).toBe('')
  })

  it('Should render nothing for undefined', () => {
    const template = <>{undefined}</>
    expect(template.toString()).toBe('')
  })
})
