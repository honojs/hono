import { assertEquals } from '@std/assert'
import { Context } from '../../src/context'
import { getColorEnabled } from '../../src/utils/color'

Deno.test('getColorEnabled() - With colors enabled', () => {
  assertEquals(getColorEnabled(), true)
})

Deno.test('getColorEnabled() - With Deno.noColor set', () => {
  const mockContext = new Context(new Request('http://localhost/'))

  assertEquals(getColorEnabled(mockContext), true)
})
