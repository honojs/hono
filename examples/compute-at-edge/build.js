const { build } = require('esbuild')
const globalsPlugin = require('@esbuild-plugins/node-globals-polyfill')
const modulesPlugin = require('@esbuild-plugins/node-modules-polyfill')

build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  minify: true,
  outfile: 'bin/index.js',
  platform: 'node',
  plugins: [
    globalsPlugin.NodeGlobalsPolyfillPlugin({
      process: true,
      buffer: true,
    }),
    modulesPlugin.NodeModulesPolyfillPlugin(),
  ],
}).catch((error) => {
  console.error(error)
  process.exit(1)
})
