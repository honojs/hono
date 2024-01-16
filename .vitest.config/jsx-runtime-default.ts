import config from '../vitest.config'
config.esbuild = {
  jsx: 'automatic',
  jsxImportSource: __dirname + '/../src/jsx',
}
if (config.test) {
  config.test.include = ['**/src/jsx/dom/**/(*.)+(spec|test).+(ts|tsx|js)']
}
export default config
