import { escape } from './html.ts'

describe('HTML escape', () => {
  it('Should escape special characters', () => {
    expect(escape('I <b>think</b> this is good.')).toBe('I &lt;b&gt;think&lt;/b&gt; this is good.')
    expect(escape('John "Johnny" Smith')).toBe('John &quot;Johnny&quot; Smith')
  })
})
