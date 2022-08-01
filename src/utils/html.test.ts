import { escape, escapeToBuffer } from './html'
import type { Buffer } from './html'

describe('HTML utilities', () => {
  describe('escape', () => {
    it('Should escape special characters', () => {
      expect(escape('I <b>think</b> this is good.')).toBe('I &lt;b&gt;think&lt;/b&gt; this is good.')
      expect(escape('John "Johnny" Smith')).toBe('John &quot;Johnny&quot; Smith')
    })
  })

  describe('escapeToBuffer', () => {
    it('Should escape special characters', () => {
      let buffer: Buffer = ['']
      escapeToBuffer('I <b>think</b> this is good.', buffer)
      expect(buffer[0]).toBe('I &lt;b&gt;think&lt;/b&gt; this is good.')

      buffer = ['']
      escapeToBuffer('John "Johnny" Smith', buffer)
      expect(buffer[0]).toBe('John &quot;Johnny&quot; Smith')
    })
  })
})
