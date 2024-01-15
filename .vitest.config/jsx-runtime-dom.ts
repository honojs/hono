import config from '../vitest.config'
config.esbuild = {
  jsx: 'automatic',
  jsxImportSource: __dirname + '/../src/jsx/dom',
}
if (config.test) {
  config.test.include = ['**/src/jsx/dom/**/(*.)+(spec|test).+(ts|tsx|js)']
}
export default config
