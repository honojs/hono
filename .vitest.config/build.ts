import config from '../vitest.config'
config.esbuild = {
  jsx: 'automatic',
  jsxImportSource: __dirname + '/../src/jsx',
}
if (config.test) {
  config.test.include = ['build_tests/**/(*.)+(spec|test).+(ts|tsx|js)']
}
export default config
