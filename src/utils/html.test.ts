import { escape, html } from './html'

describe('HTML escape', () => {
  it('Should escape special characters', () => {
    expect(escape('I <b>think</b> this is good.')).toBe('I &lt;b&gt;think&lt;/b&gt; this is good.')
    expect(escape('John "Johnny" Smith')).toBe('John &quot;Johnny&quot; Smith')
  })
})

describe('Tagged Template Literals', () => {
  it('Should escape special characters', () => {
    const name = 'John "Johnny" Smith'
    expect(html`<p>I'm ${name}.</p>`.toString()).toBe('<p>I\'m John &quot;Johnny&quot; Smith.</p>')
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
      '<p>Name:John &quot;Johnny&quot; Smith Contact:<a href=\"http://example.com/\">My Website</a></p>'
    )
  })
})
