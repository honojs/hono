import { readFileSync } from 'fs'
import { bundle } from './build'

const files = await bundle()

for (const file of files) {
  const appName = file.split('/').pop()?.replace('.js', '') as string
  const app = await import(file)
  const sourcemap = JSON.parse(readFileSync(`${file}.map`).toString())
  describe(appName, () => {
    app.shouldNotBeIncluded.forEach((token: string) => {
      it(`should not be included ${token} in sources`, () => {
        expect(sourcemap.sources.find((source: string) => source.includes(token))).toBeUndefined()
      })
    })
  })
}
