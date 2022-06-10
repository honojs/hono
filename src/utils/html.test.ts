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
})
