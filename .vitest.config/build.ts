import config from '../vitest.config'
config.esbuild = {
  jsx: 'automatic',
  jsxImportSource: __dirname + '/../src/jsx',
}
if (config.test) {
  config.test.include = ['build_tests/**/(*.)+(spec|test).+(ts|tsx|js)']
  if (config.test.coverage) {
    config.test.coverage.enabled = false
  }
}
export default config
