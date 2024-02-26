import { resolveCallback, HtmlEscapedCallbackPhase } from '../../utils/html'
import { html, raw } from '.'

describe('Tagged Template Literals', () => {
  it('Should escape special characters', () => {
    const name = 'John "Johnny" Smith'
    // eslint-disable-next-line quotes
    expect(html`<p>I'm ${name}.</p>`.toString()).toBe("<p>I'm John &quot;Johnny&quot; Smith.</p>")
  })

  describe('Booleans, Null, and Undefined Are Ignored', () => {
    it.each([true, false, undefined, null])('%s', (item) => {
      expect(html`${item}`.toString()).toBe('')
    })

    it('falsy value', () => {
      expect(html`${0}`.toString()).toBe('0')
    })
  })

  it('Should call $array.flat(Infinity)', () => {
    const values = [
      'Name:',
      ['John "Johnny" Smith', undefined, null],
      ' Contact:',
      [html`<a href="http://example.com/">My Website</a>`],
    ]
    expect(html`<p>${values}</p>`.toString()).toBe(
      '<p>Name:John &quot;Johnny&quot; Smith Contact:<a href="http://example.com/">My Website</a></p>'
    )
  })

  describe('Promise', () => {
    it('Should return Promise<string> when some variables contains Promise<string> in variables', async () => {
      const name = Promise.resolve('John "Johnny" Smith')
      const res = html`<p>I'm ${name}.</p>`
      expect(res).toBeInstanceOf(Promise)
      // eslint-disable-next-line quotes
      expect((await res).toString()).toBe("<p>I'm John &quot;Johnny&quot; Smith.</p>")
    })

    it('Should return raw value when some variables contains Promise<HtmlEscapedString> in variables', async () => {
      const name = Promise.resolve(raw('John "Johnny" Smith'))
      const res = html`<p>I'm ${name}.</p>`
      expect(res).toBeInstanceOf(Promise)
      expect((await res).toString()).toBe('<p>I\'m John "Johnny" Smith.</p>')
    })
  })

  describe('HtmlEscapedString', () => {
    it('Should preserve callbacks', async () => {
      const name = raw('Hono', [
        ({ buffer }) => {
          if (buffer) {
            buffer[0] = buffer[0].replace('Hono', 'Hono!')
          }
          return undefined
        },
      ])
      const res = html`<p>I'm ${name}.</p>`
      expect(res).toBeInstanceOf(Promise)
      // eslint-disable-next-line quotes
      expect((await res).toString()).toBe("<p>I'm Hono.</p>")
      expect(await resolveCallback(await res, HtmlEscapedCallbackPhase.Stringify, false, {})).toBe(
        // eslint-disable-next-line quotes
        "<p>I'm Hono!.</p>"
      )
    })
  })
})

describe('raw', () => {
  it('Should be marked as escaped.', () => {
    const name = 'John &quot;Johnny&quot; Smith'
    expect(html`<p>I'm ${raw(name)}.</p>`.toString()).toBe(
      // eslint-disable-next-line quotes
      "<p>I'm John &quot;Johnny&quot; Smith.</p>"
    )
  })
})
