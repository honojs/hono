import config from '../vitest.config'
config.esbuild = {
  jsx: 'automatic',
  jsxImportSource: __dirname + '/../src/jsx/dom',
}
if (config.test) {
  config.test.include = [
    '**/src/jsx/dom/**/(*.)+(spec|test).+(ts|tsx|js)',
    'src/jsx/hooks/dom.test.tsx',
  ]
  if (config.test.coverage) {
    config.test.coverage.reportsDirectory = './coverage/raw/jsx-dom'
  }
}
export default config
