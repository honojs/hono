import config from '../vitest.config'
config.esbuild = {
  jsx: 'automatic',
  jsxImportSource: __dirname + '/../src/jsx',
}
if (config.test) {
  config.test.include = [
    '**/src/jsx/dom/**/(*.)+(spec|test).+(ts|tsx|js)',
    'src/jsx/hooks/dom.test.tsx',
  ]
  if (config.test.coverage) {
    config.test.coverage.reportsDirectory = './coverage/raw/jsx-runtime'
  }
}
export default config
