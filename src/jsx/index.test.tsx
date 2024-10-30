/** @jsxImportSource ./ */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { html } from '../helper/html'
import { Hono } from '../hono'
import { Suspense, renderToReadableStream } from './streaming'
import DefaultExport, { Fragment, StrictMode, createContext, memo, useContext, version } from '.'
import type { Context, FC, PropsWithChildren } from '.'

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

  it('Should render async component', async () => {
    const ChildAsyncComponent = async () => {
      await new Promise((resolve) => setTimeout(resolve, 10))
      return <span>child async component</span>
    }

    const AsyncComponent = async () => {
      await new Promise((resolve) => setTimeout(resolve, 10))
      return (
        <h1>
          Hello from async component
          <ChildAsyncComponent />
        </h1>
      )
    }

    app.get('/', (c) => {
      return c.html(<AsyncComponent />)
    })
    const res = await app.request('http://localhost/')
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('text/html; charset=UTF-8')
    expect(await res.text()).toBe(
      '<h1>Hello from async component<span>child async component</span></h1>'
    )
  })

  it('Should render async component with "html" tagged template strings', async () => {
    const AsyncComponent = async () => {
      await new Promise((resolve) => setTimeout(resolve, 10))
      return <h1>Hello from async component</h1>
    }

    app.get('/', (c) => {
      // prettier-ignore
      return c.html(
        html`<html><body>${(<AsyncComponent />)}</body></html>`
      )
    })
    const res = await app.request('http://localhost/')
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('text/html; charset=UTF-8')
    expect(await res.text()).toBe('<html><body><h1>Hello from async component</h1></body></html>')
  })

  it('Should handle async component error', async () => {
    const componentError = new Error('Error from async error component')

    const AsyncComponent = async () => {
      await new Promise((resolve) => setTimeout(resolve, 10))
      return <h1>Hello from async component</h1>
    }
    const AsyncErrorComponent = async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
      throw componentError
    }

    let raisedError: any
    app.onError((e, c) => {
      raisedError = e
      return c.html('<html><body><h1>Error from onError</h1></body></html>', 500)
    })
    app.get('/', (c) => {
      return c.html(
        <>
          <AsyncComponent />
          <AsyncErrorComponent />
        </>
      )
    })

    const res = await app.request('http://localhost/')
    expect(res.status).toBe(500)
    expect(res.headers.get('Content-Type')).toBe('text/html; charset=UTF-8')
    expect(await res.text()).toBe('<html><body><h1>Error from onError</h1></body></html>')
    expect(raisedError).toBe(componentError)
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

  it('Empty elements are rended without closing tag', () => {
    const template = <input />
    expect(template.toString()).toBe('<input/>')
  })

  it('Empty elements with children are rended with children and closing tag', () => {
    const template = <link>https://example.com</link>
    expect(template.toString()).toBe('<link>https://example.com</link>')
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

  describe('download attribute', () => {
    it('<a download={true}></a> should be rendered as <a download=""></a>', () => {
      const template = <a download={true}></a>
      expect(template.toString()).toBe('<a download=""></a>')
    })

    it('<a download={false}></a> should be rendered as <a></a>', () => {
      const template = <a download={false}></a>
      expect(template.toString()).toBe('<a></a>')
    })

    it('<a download></a> should be rendered as <a download=""></a>', () => {
      const template = <a download></a>
      expect(template.toString()).toBe('<a download=""></a>')
    })

    it('<a download="test"></a> should be rendered as <a download="test"></a>', () => {
      const template = <a download='test'></a>
      expect(template.toString()).toBe('<a download="test"></a>')
    })
  })

  describe('Function', () => {
    it('should be ignored used in on* props', () => {
      const onClick = () => {}
      const template = <button onClick={onClick}>Click</button>
      expect(template.toString()).toBe('<button>Click</button>')
    })

    it('should raise an error if used in other props', () => {
      const onClick = () => {}
      const template = <button data-handler={onClick}>Click</button>
      expect(() => template.toString()).toThrow()
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
        '<div><div>This is item 0 in the list</div><div>This is item 1 in the list</div><div>This is item 2 in the list</div><div>This is item 3 in the list</div><div>This is item 4 in the list</div><div>This is item 5 in the list</div><div>This is item 6 in the list</div><div>This is item 7 in the list</div><div>This is item 8 in the list</div><div>This is item 9 in the list</div></div>'
      )
    })
  })

  describe('FC', () => {
    it('Should define the type correctly', () => {
      const Layout: FC<PropsWithChildren<{ title: string }>> = (props) => {
        return (
          <html>
            <head>
              <title>{props.title}</title>
            </head>
            <body>{props.children}</body>
          </html>
        )
      }

      const Top = (
        <Layout title='Home page'>
          <h1>Hono</h1>
          <p>Hono is great</p>
        </Layout>
      )

      expect(Top.toString()).toBe(
        '<html><head><title>Home page</title></head><body><h1>Hono</h1><p>Hono is great</p></body></html>'
      )
    })

    describe('Booleans, Null, and Undefined Are Ignored', () => {
      it.each([true, false, undefined, null])('%s', (item) => {
        const Component: FC = (() => {
          return item
        }) as FC
        const template = <Component />
        expect(template.toString()).toBe('')
      })

      it('falsy value', () => {
        const Component: FC = (() => {
          return 0
        }) as unknown as FC
        const template = <Component />
        expect(template.toString()).toBe('0')
      })
    })
  })

  describe('style attribute', () => {
    it('should convert the object to strings', () => {
      const template = (
        <h1
          style={{
            color: 'red',
            fontSize: 'small',
            fontFamily: 'Menlo, Consolas, "DejaVu Sans Mono", monospace',
          }}
        >
          Hello
        </h1>
      )
      expect(template.toString()).toBe(
        '<h1 style="color:red;font-size:small;font-family:Menlo, Consolas, &quot;DejaVu Sans Mono&quot;, monospace">Hello</h1>'
      )
    })
    it('should not convert the strings', () => {
      const template = <h1 style='color:red;font-size:small'>Hello</h1>
      expect(template.toString()).toBe('<h1 style="color:red;font-size:small">Hello</h1>')
    })
    it('should render variable without any name conversion', () => {
      const template = <h1 style={{ '--myVar': 1 }}>Hello</h1>
      expect(template.toString()).toBe('<h1 style="--myVar:1px">Hello</h1>')
    })
  })

  describe('HtmlEscaped in props', () => {
    it('should not be double-escaped', () => {
      const escapedString = html`${'<html-escaped-string>'}`
      const template = <span data-text={escapedString}>Hello</span>
      expect(template.toString()).toBe('<span data-text="&lt;html-escaped-string&gt;">Hello</span>')
    })
  })

  describe('head', () => {
    it('Simple head elements should be rendered as is', () => {
      const template = (
        <head>
          <title>Hono!</title>
          <meta name='description' content='A description' />
          <script src='script.js'></script>
        </head>
      )
      expect(template.toString()).toBe(
        '<head><title>Hono!</title><meta name="description" content="A description"/><script src="script.js"></script></head>'
      )
    })
  })
})

describe('className', () => {
  it('should convert to class attribute for intrinsic elements', () => {
    const template = <h1 className='h1'>Hello</h1>
    expect(template.toString()).toBe('<h1 class="h1">Hello</h1>')
  })

  it('should convert to class attribute for custom elements', () => {
    const template = <custom-element className='h1'>Hello</custom-element>
    expect(template.toString()).toBe('<custom-element class="h1">Hello</custom-element>')
  })

  it('should not convert to class attribute for custom components', () => {
    const CustomComponent: FC<{ className: string }> = ({ className }) => (
      <div data-class-name={className}>Hello</div>
    )
    const template = <CustomComponent className='h1' />
    expect(template.toString()).toBe('<div data-class-name="h1">Hello</div>')
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

  it('Should render children - with `Fragment`', () => {
    const template = (
      <Fragment>
        <p>1</p>
        <p>2</p>
      </Fragment>
    )
    expect(template.toString()).toBe('<p>1</p><p>2</p>')
  })

  it('Should render a child', () => {
    const template = (
      <>
        <p>1</p>
      </>
    )
    expect(template.toString()).toBe('<p>1</p>')
  })

  it('Should render a child - with `Fragment`', () => {
    const template = (
      <Fragment>
        <p>1</p>
      </Fragment>
    )
    expect(template.toString()).toBe('<p>1</p>')
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

describe('StrictMode', () => {
  it('Should render children', () => {
    const template = (
      <StrictMode>
        <p>1</p>
        <p>2</p>
      </StrictMode>
    )
    expect(template.toString()).toBe('<p>1</p><p>2</p>')
  })
})

describe('SVG', () => {
  it('simple', () => {
    const template = (
      <svg>
        <circle cx='50' cy='50' r='40' stroke='black' stroke-width='3' fill='red' />
      </svg>
    )
    expect(template.toString()).toBe(
      '<svg><circle cx="50" cy="50" r="40" stroke="black" stroke-width="3" fill="red"></circle></svg>'
    )
  })

  it('title element', () => {
    const template = (
      <>
        <head>
          <title>Document Title</title>
        </head>
        <svg>
          <title>SVG Title</title>
        </svg>
      </>
    )
    expect(template.toString()).toBe(
      '<head><title>Document Title</title></head><svg><title>SVG Title</title></svg>'
    )
  })

  describe('attribute', () => {
    describe('camelCase', () => {
      test.each`
        key
        ${'attributeName'}
        ${'baseFrequency'}
        ${'calcMode'}
        ${'clipPathUnits'}
        ${'diffuseConstant'}
        ${'edgeMode'}
        ${'filterUnits'}
        ${'gradientTransform'}
        ${'gradientUnits'}
        ${'kernelMatrix'}
        ${'kernelUnitLength'}
        ${'keyPoints'}
        ${'keySplines'}
        ${'keyTimes'}
        ${'lengthAdjust'}
        ${'limitingConeAngle'}
        ${'markerHeight'}
        ${'markerUnits'}
        ${'markerWidth'}
        ${'maskContentUnits'}
        ${'maskUnits'}
        ${'numOctaves'}
        ${'pathLength'}
        ${'patternContentUnits'}
        ${'patternTransform'}
        ${'patternUnits'}
        ${'pointsAtX'}
        ${'pointsAtY'}
        ${'pointsAtZ'}
        ${'preserveAlpha'}
        ${'preserveAspectRatio'}
        ${'primitiveUnits'}
        ${'refX'}
        ${'refY'}
        ${'repeatCount'}
        ${'repeatDur'}
        ${'specularConstant'}
        ${'specularExponent'}
        ${'spreadMethod'}
        ${'startOffset'}
        ${'stdDeviation'}
        ${'stitchTiles'}
        ${'surfaceScale'}
        ${'crossorigin'}
        ${'systemLanguage'}
        ${'tableValues'}
        ${'targetX'}
        ${'targetY'}
        ${'textLength'}
        ${'viewBox'}
        ${'xChannelSelector'}
        ${'yChannelSelector'}
      `('$key', ({ key }) => {
        const template = (
          <svg>
            <g {...{ [key]: 'test' }} />
          </svg>
        )
        expect(template.toString()).toBe(`<svg><g ${key}="test"></g></svg>`)
      })
    })

    describe('kebab-case', () => {
      test.each`
        key
        ${'alignmentBaseline'}
        ${'baselineShift'}
        ${'clipPath'}
        ${'clipRule'}
        ${'colorInterpolation'}
        ${'colorInterpolationFilters'}
        ${'dominantBaseline'}
        ${'fillOpacity'}
        ${'fillRule'}
        ${'floodColor'}
        ${'floodOpacity'}
        ${'fontFamily'}
        ${'fontSize'}
        ${'fontSizeAdjust'}
        ${'fontStretch'}
        ${'fontStyle'}
        ${'fontVariant'}
        ${'fontWeight'}
        ${'imageRendering'}
        ${'letterSpacing'}
        ${'lightingColor'}
        ${'markerEnd'}
        ${'markerMid'}
        ${'markerStart'}
        ${'overlinePosition'}
        ${'overlineThickness'}
        ${'paintOrder'}
        ${'pointerEvents'}
        ${'shapeRendering'}
        ${'stopColor'}
        ${'stopOpacity'}
        ${'strikethroughPosition'}
        ${'strikethroughThickness'}
        ${'strokeDasharray'}
        ${'strokeDashoffset'}
        ${'strokeLinecap'}
        ${'strokeLinejoin'}
        ${'strokeMiterlimit'}
        ${'strokeOpacity'}
        ${'strokeWidth'}
        ${'textAnchor'}
        ${'textDecoration'}
        ${'textRendering'}
        ${'transformOrigin'}
        ${'underlinePosition'}
        ${'underlineThickness'}
        ${'unicodeBidi'}
        ${'vectorEffect'}
        ${'wordSpacing'}
        ${'writingMode'}
      `('$key', ({ key }) => {
        const template = (
          <svg>
            <g {...{ [key]: 'test' }} />
          </svg>
        )
        expect(template.toString()).toBe(
          `<svg><g ${key.replace(/([A-Z])/g, '-$1').toLowerCase()}="test"></g></svg>`
        )
      })
    })

    describe('data-*', () => {
      test.each`
        key
        ${'data-foo'}
        ${'data-foo-bar'}
        ${'data-fooBar'}
      `('$key', ({ key }) => {
        const template = (
          <svg>
            <g {...{ [key]: 'test' }} />
          </svg>
        )
        expect(template.toString()).toBe(`<svg><g ${key}="test"></g></svg>`)
      })
    })
  })
})

describe('Context', () => {
  let ThemeContext: Context<string>
  let Consumer: FC
  let ErrorConsumer: FC
  let AsyncConsumer: FC
  let AsyncErrorConsumer: FC
  beforeAll(() => {
    ThemeContext = createContext('light')
    Consumer = () => {
      const theme = useContext(ThemeContext)
      return <span>{theme}</span>
    }
    ErrorConsumer = () => {
      throw new Error('ErrorConsumer')
    }
    AsyncConsumer = async () => {
      const theme = useContext(ThemeContext)
      return <span>{theme}</span>
    }
    AsyncErrorConsumer = async () => {
      throw new Error('AsyncErrorConsumer')
    }
  })

  describe('with .Provider', () => {
    it('has a child', () => {
      const template = (
        <ThemeContext.Provider value='dark'>
          <Consumer />
        </ThemeContext.Provider>
      )
      expect(template.toString()).toBe('<span>dark</span>')
    })

    it('has children', () => {
      const template = (
        <ThemeContext.Provider value='dark'>
          <div>
            <Consumer />!
          </div>
          <div>
            <Consumer />!
          </div>
        </ThemeContext.Provider>
      )
      expect(template.toString()).toBe('<div><span>dark</span>!</div><div><span>dark</span>!</div>')
    })

    it('nested', () => {
      const template = (
        <ThemeContext.Provider value='dark'>
          <Consumer />
          <ThemeContext.Provider value='black'>
            <Consumer />
          </ThemeContext.Provider>
          <Consumer />
        </ThemeContext.Provider>
      )
      expect(template.toString()).toBe('<span>dark</span><span>black</span><span>dark</span>')
    })

    it('should reset context by error', () => {
      const template = (
        <ThemeContext.Provider value='dark'>
          <ErrorConsumer />
        </ThemeContext.Provider>
      )
      expect(() => template.toString()).toThrow()

      const nextRequest = <Consumer />
      expect(nextRequest.toString()).toBe('<span>light</span>')
    })
  })

  describe('<Context> as a provider ', () => {
    it('has a child', () => {
      const template = (
        <ThemeContext value='dark'>
          <Consumer />
        </ThemeContext>
      )
      expect(template.toString()).toBe('<span>dark</span>')
    })
  })

  it('default value', () => {
    const template = <Consumer />
    expect(template.toString()).toBe('<span>light</span>')
  })

  describe('with Suspence', () => {
    const RedTheme = () => (
      <ThemeContext.Provider value='red'>
        <Consumer />
      </ThemeContext.Provider>
    )

    it('Should preserve context in sync component', async () => {
      const template = (
        <ThemeContext.Provider value='dark'>
          <Suspense fallback={<RedTheme />}>
            <Consumer />
            <ThemeContext.Provider value='black'>
              <Consumer />
            </ThemeContext.Provider>
          </Suspense>
        </ThemeContext.Provider>
      )
      const stream = renderToReadableStream(template)

      const chunks = []
      const textDecoder = new TextDecoder()
      for await (const chunk of stream as any) {
        chunks.push(textDecoder.decode(chunk))
      }

      expect(chunks).toEqual(['<span>dark</span><span>black</span>'])
    })

    it('Should preserve context in async component', async () => {
      const template = (
        <ThemeContext.Provider value='dark'>
          <Suspense fallback={<RedTheme />}>
            <Consumer />
            <ThemeContext.Provider value='black'>
              <AsyncConsumer />
            </ThemeContext.Provider>
          </Suspense>
        </ThemeContext.Provider>
      )
      const stream = renderToReadableStream(template)

      const chunks = []
      const textDecoder = new TextDecoder()
      for await (const chunk of stream as any) {
        chunks.push(textDecoder.decode(chunk))
      }

      expect(chunks).toEqual([
        '<template id="H:0"></template><span>red</span><!--/$-->',
        `<template data-hono-target="H:0"><span>dark</span><span>black</span></template><script>
((d,c,n) => {
c=d.currentScript.previousSibling
d=d.getElementById('H:0')
if(!d)return
do{n=d.nextSibling;n.remove()}while(n.nodeType!=8||n.nodeValue!='/$')
d.replaceWith(c.content)
})(document)
</script>`,
      ])
    })
  })

  describe('async component', () => {
    const ParentAsyncConsumer = async () => {
      const theme = useContext(ThemeContext)
      return (
        <div>
          <span>{theme}</span>
          <AsyncConsumer />
        </div>
      )
    }

    const ParentAsyncErrorConsumer = async () => {
      const theme = useContext(ThemeContext)
      return (
        <div>
          <span>{theme}</span>
          <AsyncErrorConsumer />
        </div>
      )
    }

    it('simple', async () => {
      const template = (
        <ThemeContext.Provider value='dark'>
          <AsyncConsumer />
        </ThemeContext.Provider>
      )
      expect((await template.toString()).toString()).toBe('<span>dark</span>')
    })

    it('nested', async () => {
      const template = (
        <ThemeContext.Provider value='dark'>
          <ParentAsyncConsumer />
        </ThemeContext.Provider>
      )
      expect((await template.toString()).toString()).toBe(
        '<div><span>dark</span><span>dark</span></div>'
      )
    })

    it('should reset context by error', async () => {
      const template = (
        <ThemeContext.Provider value='dark'>
          <ParentAsyncErrorConsumer />
        </ThemeContext.Provider>
      )
      expect(async () => (await template.toString()).toString()).rejects.toThrow()

      const nextRequest = <Consumer />
      expect(nextRequest.toString()).toBe('<span>light</span>')
    })
  })
})

describe('version', () => {
  it('should be defined with semantic versioning format', () => {
    expect(version).toMatch(/^\d+\.\d+\.\d+-hono-jsx$/)
  })
})

describe('default export', () => {
  ;[
    'version',
    'memo',
    'Fragment',
    'isValidElement',
    'createElement',
    'cloneElement',
    'ErrorBoundary',
    'createContext',
    'useContext',
    'useState',
    'useEffect',
    'useRef',
    'useCallback',
    'useReducer',
    'useDebugValue',
    'createRef',
    'forwardRef',
    'useImperativeHandle',
    'useSyncExternalStore',
    'use',
    'startTransition',
    'useTransition',
    'useDeferredValue',
    'startViewTransition',
    'useViewTransition',
    'useMemo',
    'useLayoutEffect',
    'useInsertionEffect',
    'useActionState',
    'useOptimistic',
    'Suspense',
    'StrictMode',
  ].forEach((key) => {
    it(key, () => {
      expect((DefaultExport as any)[key]).toBeDefined()
    })
  })
})
