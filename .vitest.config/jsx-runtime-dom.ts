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
}
export default config
