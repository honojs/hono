import { expect, test } from 'bun:test'

test('Bun.build compatibility test', async () => {
  try {
    const result = await Bun.build({
      entrypoints: ['./src/utils/color.ts'],
      format: 'esm',
      minify: true,
      external: [],
    })

    expect(result.success).toBe(true)
    expect(result.logs).toHaveLength(0)
    expect(result.outputs).toHaveLength(1)

    const outputContent = await result.outputs[0].text()
    expect(outputContent).toBeDefined()
  } catch (error) {
    throw new Error(`Bun.build failed: ${error}`)
  }
})
