/** @jsxImportSource ../ */
import { useActionState } from '../'

describe('intrinsic element', () => {
  describe('document metadata', () => {
    describe('title element', () => {
      it('should be hoisted title tag', async () => {
        const template = (
          <html>
            <head></head>
            <body>
              <title>Hello</title>
              <h1>World</h1>
            </body>
          </html>
        )
        expect(template.toString()).toBe(
          '<html><head><title>Hello</title></head><body><h1>World</h1></body></html>'
        )
      })
    })

    describe('link element', () => {
      it('should be hoisted link tag', async () => {
        const template = (
          <html>
            <head></head>
            <body>
              <link rel='stylesheet' href='style.css' precedence='default' />
              <h1>World</h1>
            </body>
          </html>
        )
        expect(template.toString()).toBe(
          '<html><head><link rel="stylesheet" href="style.css" data-precedence="default"/></head><body><h1>World</h1></body></html>'
        )
      })

      it('should be ordered by precedence attribute', () => {
        const template = (
          <html>
            <head></head>
            <body>
              <link rel='stylesheet' href='style1.css' precedence='default' />
              <link rel='stylesheet' href='style2.css' precedence='high' />
              <link rel='stylesheet' href='style3.css' precedence='default' />
              <h1>World</h1>
            </body>
          </html>
        )
        expect(template.toString()).toBe(
          '<html><head><link rel="stylesheet" href="style1.css" data-precedence="default"/><link rel="stylesheet" href="style3.css" data-precedence="default"/><link rel="stylesheet" href="style2.css" data-precedence="high"/></head><body><h1>World</h1></body></html>'
        )
      })

      it('should be de-duped by href', () => {
        const template = (
          <html>
            <head></head>
            <body>
              <link rel='stylesheet' href='style1.css' precedence='default' />
              <link rel='stylesheet' href='style2.css' precedence='high' />
              <link rel='stylesheet' href='style1.css' precedence='default' />
              <h1>World</h1>
            </body>
          </html>
        )
        expect(template.toString()).toBe(
          '<html><head><link rel="stylesheet" href="style1.css" data-precedence="default"/><link rel="stylesheet" href="style2.css" data-precedence="high"/></head><body><h1>World</h1></body></html>'
        )
      })

      it('should be inserted as is if <head> is not present', () => {
        const template = (
          <html>
            <body>
              <link rel='stylesheet' href='style1.css' precedence='default' />
              <link rel='stylesheet' href='style2.css' precedence='high' />
              <h1>World</h1>
            </body>
          </html>
        )
        expect(template.toString()).toBe(
          '<html><body><link rel="stylesheet" href="style1.css" data-precedence="default"/><link rel="stylesheet" href="style2.css" data-precedence="high"/><h1>World</h1></body></html>'
        )
      })

      it('should not do special behavior if disabled is present', () => {
        const template = (
          <html>
            <head></head>
            <body>
              <link rel='stylesheet' href='style1.css' precedence='default' />
              <link rel='stylesheet' href='style2.css' precedence='default' disabled />
              <h1>World</h1>
            </body>
          </html>
        )
        expect(template.toString()).toBe(
          '<html><head><link rel="stylesheet" href="style1.css" data-precedence="default"/></head><body><link rel="stylesheet" href="style2.css" precedence="default" disabled=""/><h1>World</h1></body></html>'
        )
      })

      it('should not be hoisted if has no precedence attribute', () => {
        const template = (
          <html>
            <head></head>
            <body>
              <link rel='stylesheet' href='style1.css' />
              <h1>World</h1>
            </body>
          </html>
        )
        expect(template.toString()).toBe(
          '<html><head></head><body><link rel="stylesheet" href="style1.css"/><h1>World</h1></body></html>'
        )
      })

      describe('React 19 compatibility', () => {
        const headContent = (html: string) => html.match(/<head>(.*)<\/head>/)?.[1] ?? ''
        const bodyContent = (html: string) => html.match(/<body>(.*)<\/body>/)?.[1] ?? ''
        const renderDocument = (children: unknown) =>
          (
            <html>
              <head></head>
              <body>{children}</body>
            </html>
          ).toString()
        const assertHeadAndBody = (children: unknown, expectedHead: string, expectedBody = '') => {
          const output = renderDocument(children)
          expect(headContent(output)).toBe(expectedHead)
          expect(bodyContent(output)).toBe(expectedBody)
        }

        const canonical = () => <link rel='canonical' href='https://example.com/en/about' />
        const alternateEn = () => (
          <link rel='alternate' hrefLang='en' href='https://example.com/en/about' />
        )
        const alternateJa = () => (
          <link rel='alternate' hrefLang='ja' href='https://example.com/ja/about' />
        )

        it('should keep canonical and alternates in source order', () => {
          assertHeadAndBody(
            <>
              {canonical()}
              {alternateEn()}
              {alternateJa()}
            </>,
            '<link rel="canonical" href="https://example.com/en/about"/><link rel="alternate" hrefLang="en" href="https://example.com/en/about"/><link rel="alternate" hrefLang="ja" href="https://example.com/ja/about"/>'
          )
        })

        it('should keep alternate-canonical-alternate order', () => {
          assertHeadAndBody(
            <>
              {alternateEn()}
              {canonical()}
              {alternateJa()}
            </>,
            '<link rel="alternate" hrefLang="en" href="https://example.com/en/about"/><link rel="canonical" href="https://example.com/en/about"/><link rel="alternate" hrefLang="ja" href="https://example.com/ja/about"/>'
          )
        })

        it('should not de-dupe canonical links', () => {
          assertHeadAndBody(
            <>
              {canonical()}
              {canonical()}
            </>,
            '<link rel="canonical" href="https://example.com/en/about"/><link rel="canonical" href="https://example.com/en/about"/>'
          )
        })

        it('should not de-dupe alternate links', () => {
          assertHeadAndBody(
            <>
              {alternateEn()}
              {alternateEn()}
            </>,
            '<link rel="alternate" hrefLang="en" href="https://example.com/en/about"/><link rel="alternate" hrefLang="en" href="https://example.com/en/about"/>'
          )
        })

        it('should de-dupe stylesheet with precedence', () => {
          assertHeadAndBody(
            <>
              <link rel='stylesheet' href='/style.css' precedence='default' />
              <link rel='stylesheet' href='/style.css' precedence='default' />
            </>,
            '<link rel="stylesheet" href="/style.css" data-precedence="default"/>'
          )
        })

        it('should not de-dupe stylesheet against preload with same href', () => {
          assertHeadAndBody(
            <>
              <link rel='preload' href='/style.css' as='style' />
              <link rel='stylesheet' href='/style.css' precedence='default' />
              <link rel='stylesheet' href='/style.css' precedence='default' />
            </>,
            '<link rel="stylesheet" href="/style.css" data-precedence="default"/><link rel="preload" href="/style.css" as="style"/>'
          )
        })

        it('should not hoist stylesheet without precedence', () => {
          assertHeadAndBody(
            <>
              <link rel='stylesheet' href='/style.css' />
              <link rel='stylesheet' href='/style.css' />
            </>,
            '',
            '<link rel="stylesheet" href="/style.css"/><link rel="stylesheet" href="/style.css"/>'
          )
        })

        it('should keep different stylesheets with same precedence', () => {
          assertHeadAndBody(
            <>
              <link rel='stylesheet' href='/a.css' precedence='default' />
              <link rel='stylesheet' href='/b.css' precedence='default' />
            </>,
            '<link rel="stylesheet" href="/a.css" data-precedence="default"/><link rel="stylesheet" href="/b.css" data-precedence="default"/>'
          )
        })

        it('should not de-dupe preload links', () => {
          assertHeadAndBody(
            <>
              <link rel='preload' href='/font.woff2' as='font' crossOrigin='' />
              <link rel='preload' href='/font.woff2' as='font' crossOrigin='' />
            </>,
            '<link rel="preload" href="/font.woff2" as="font" crossorigin=""/><link rel="preload" href="/font.woff2" as="font" crossorigin=""/>'
          )
        })

        it('should not de-dupe modulepreload links', () => {
          assertHeadAndBody(
            <>
              <link rel='modulepreload' href='/module.js' />
              <link rel='modulepreload' href='/module.js' />
            </>,
            '<link rel="modulepreload" href="/module.js"/><link rel="modulepreload" href="/module.js"/>'
          )
        })

        it('should keep links from two components', () => {
          const Head = () => (
            <>
              <link rel='canonical' href='https://example.com/en/about' />
              <link rel='alternate' hrefLang='en' href='https://example.com/en/about' />
              <link rel='alternate' hrefLang='ja' href='https://example.com/ja/about' />
            </>
          )
          const Body = () => (
            <>
              <link rel='canonical' href='https://example.com/en/about' />
              <link rel='alternate' hrefLang='en' href='https://example.com/en/about' />
              <link rel='alternate' hrefLang='ja' href='https://example.com/ja/about' />
            </>
          )
          assertHeadAndBody(
            <>
              <Head />
              <Body />
            </>,
            '<link rel="canonical" href="https://example.com/en/about"/><link rel="alternate" hrefLang="en" href="https://example.com/en/about"/><link rel="alternate" hrefLang="ja" href="https://example.com/ja/about"/><link rel="canonical" href="https://example.com/en/about"/><link rel="alternate" hrefLang="en" href="https://example.com/en/about"/><link rel="alternate" hrefLang="ja" href="https://example.com/ja/about"/>'
          )
        })

        it('should hoist from deep nested component and keep duplicates', () => {
          const Nested = () => (
            <div>
              <div>
                <link rel='canonical' href='https://example.com/en/about' />
              </div>
            </div>
          )
          assertHeadAndBody(
            <>
              <link rel='canonical' href='https://example.com/en/about' />
              <Nested />
            </>,
            '<link rel="canonical" href="https://example.com/en/about"/><link rel="canonical" href="https://example.com/en/about"/>',
            '<div><div></div></div>'
          )
        })

        it('should keep mixed links and de-dupe only stylesheet', () => {
          assertHeadAndBody(
            <>
              <link rel='canonical' href='https://example.com/en/about' />
              <link rel='alternate' hrefLang='en' href='https://example.com/en/about' />
              <link rel='stylesheet' href='/style.css' precedence='default' />
              <link rel='preload' href='/font.woff2' as='font' crossOrigin='' />
              <link rel='canonical' href='https://example.com/en/about' />
              <link rel='alternate' hrefLang='en' href='https://example.com/en/about' />
              <link rel='stylesheet' href='/style.css' precedence='default' />
              <link rel='preload' href='/font.woff2' as='font' crossOrigin='' />
            </>,
            '<link rel="stylesheet" href="/style.css" data-precedence="default"/><link rel="canonical" href="https://example.com/en/about"/><link rel="alternate" hrefLang="en" href="https://example.com/en/about"/><link rel="preload" href="/font.woff2" as="font" crossorigin=""/><link rel="canonical" href="https://example.com/en/about"/><link rel="alternate" hrefLang="en" href="https://example.com/en/about"/><link rel="preload" href="/font.woff2" as="font" crossorigin=""/>'
          )
        })
      })
    })

    describe('meta element', () => {
      it('should be hoisted meta tag', async () => {
        const template = (
          <html>
            <head></head>
            <body>
              <meta name='description' content='Hello' />
              <h1>World</h1>
            </body>
          </html>
        )
        expect(template.toString()).toBe(
          '<html><head><meta name="description" content="Hello"/></head><body><h1>World</h1></body></html>'
        )
      })

      it('should be de-duped by name', () => {
        const template = (
          <html>
            <head></head>
            <body>
              <meta name='description' content='Hello' />
              <meta name='description' content='World' />
              <h1>World</h1>
            </body>
          </html>
        )
        expect(template.toString()).toBe(
          '<html><head><meta name="description" content="Hello"/></head><body><h1>World</h1></body></html>'
        )
      })

      it('should not do special behavior if itemProp is present', () => {
        const template = (
          <html>
            <head></head>
            <body>
              <meta name='description' content='Hello' itemProp='test' />
              <h1>World</h1>
            </body>
          </html>
        )
        expect(template.toString()).toBe(
          '<html><head></head><body><meta name="description" content="Hello" itemprop="test"/><h1>World</h1></body></html>'
        )
      })
    })

    describe('script element', () => {
      it('should be hoisted script tag', async () => {
        const template = (
          <html>
            <head></head>
            <body>
              <script src='script.js' async={true} />
              <h1>World</h1>
            </body>
          </html>
        )
        expect(template.toString()).toBe(
          '<html><head><script src="script.js" async=""></script></head><body><h1>World</h1></body></html>'
        )
      })

      it('should be de-duped by href with async={true}', () => {
        const template = (
          <html>
            <head></head>
            <body>
              <script src='script.js' async />
              <script src='script.js' async />
              <h1>World</h1>
            </body>
          </html>
        )
        expect(template.toString()).toBe(
          '<html><head><script src="script.js" async=""></script></head><body><h1>World</h1></body></html>'
        )
      })

      it('should be omitted "blocking", "onLoad" and "onError" props', () => {
        const template = (
          <html>
            <head></head>
            <body>
              <script
                src='script.js'
                async={true}
                onLoad={() => {}}
                onError={() => {}}
                blocking='render'
              />
              <h1>World</h1>
            </body>
          </html>
        )
        expect(template.toString()).toBe(
          '<html><head><script src="script.js" async=""></script></head><body><h1>World</h1></body></html>'
        )
      })

      it('should not do special behavior if async is not present', () => {
        const template = (
          <html>
            <head></head>
            <body>
              <script src='script.js' />
              <h1>World</h1>
            </body>
          </html>
        )
        expect(template.toString()).toBe(
          '<html><head></head><body><script src="script.js"></script><h1>World</h1></body></html>'
        )
      })
    })

    describe('style element', () => {
      it('should be hoisted style tag', async () => {
        const template = (
          <html>
            <head></head>
            <body>
              <style href='red' precedence='default'>
                {'body { color: red; }'}
              </style>
              <h1>World</h1>
            </body>
          </html>
        )
        expect(template.toString()).toBe(
          '<html><head><style data-href="red" data-precedence="default">body { color: red; }</style></head><body><h1>World</h1></body></html>'
        )
      })

      it('should be sorted by precedence attribute', async () => {
        const template = (
          <html>
            <head></head>
            <body>
              <style href='red' precedence='default'>
                {'body { color: red; }'}
              </style>
              <style href='green' precedence='high'>
                {'body { color: green; }'}
              </style>
              <style href='blue' precedence='default'>
                {'body { color: blue; }'}
              </style>
              <h1>World</h1>
            </body>
          </html>
        )
        expect(template.toString()).toBe(
          '<html><head><style data-href="red" data-precedence="default">body { color: red; }</style><style data-href="blue" data-precedence="default">body { color: blue; }</style><style data-href="green" data-precedence="high">body { color: green; }</style></head><body><h1>World</h1></body></html>'
        )
      })

      it('should not be hoisted if href is not present', () => {
        const template = (
          <html>
            <head></head>
            <body>
              <style>{'body { color: red; }'}</style>
              <h1>World</h1>
            </body>
          </html>
        )
        expect(template.toString()).toBe(
          '<html><head></head><body><style>body { color: red; }</style><h1>World</h1></body></html>'
        )
      })
    })
  })

  describe('form element', () => {
    it('should be omitted "action" prop if it is a function', () => {
      const template = (
        <html>
          <head></head>
          <body>
            <form action={() => {}} method='get'>
              <input type='text' />
            </form>
          </body>
        </html>
      )
      expect(template.toString()).toBe(
        '<html><head></head><body><form method="get"><input type="text"/></form></body></html>'
      )
    })

    it('should be rendered permalink', () => {
      const [, action] = useActionState(() => {}, {}, 'permalink')
      const template = (
        <html>
          <head></head>
          <body>
            <form action={action} method='get'>
              <input type='text' />
            </form>
          </body>
        </html>
      )
      expect(template.toString()).toBe(
        '<html><head></head><body><form action="permalink" method="get"><input type="text"/></form></body></html>'
      )
    })

    it('should not do special behavior if action is a string', () => {
      const template = (
        <html>
          <head></head>
          <body>
            <form action='/entries' method='get'>
              <input type='text' />
            </form>
          </body>
        </html>
      )
      expect(template.toString()).toBe(
        '<html><head></head><body><form action="/entries" method="get"><input type="text"/></form></body></html>'
      )
    })

    it('should not do special behavior if no action prop', () => {
      const template = (
        <html>
          <head></head>
          <body>
            <form>
              <input type='text' />
            </form>
          </body>
        </html>
      )
      expect(template.toString()).toBe(
        '<html><head></head><body><form><input type="text"/></form></body></html>'
      )
    })

    describe('input element', () => {
      it('should be rendered as is', () => {
        const template = <input type='text' />
        expect(template.toString()).toBe('<input type="text"/>')
      })

      it('should be omitted "formAction" prop if it is a function', () => {
        const template = (
          <html>
            <head></head>
            <body>
              <input type='text' formAction={() => {}} />
            </body>
          </html>
        )
        expect(template.toString()).toBe(
          '<html><head></head><body><input type="text"/></body></html>'
        )
      })

      it('should be rendered permalink', () => {
        const [, formAction] = useActionState(() => {}, {}, 'permalink')
        const template = (
          <html>
            <head></head>
            <body>
              <input type='text' formAction={formAction} />
            </body>
          </html>
        )
        expect(template.toString()).toBe(
          '<html><head></head><body><input type="text" formaction="permalink"/></body></html>'
        )
      })
    })
  })
})

export {}
