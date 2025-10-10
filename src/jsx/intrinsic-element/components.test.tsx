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
