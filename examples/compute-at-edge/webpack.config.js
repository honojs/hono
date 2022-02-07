const path = require('path')

module.exports = {
  entry: './index.js',
  optimization: {
    minimize: true,
  },
  target: ['webworker'],
  output: {
    filename: 'index.js',
    path: path.resolve(__dirname, 'bin'),
    libraryTarget: 'this',
  },
  resolve: {
    fallback: {
      buffer: require.resolve('buffer/'),
      crypto: require.resolve('crypto-browserify'),
      stream: require.resolve('stream-browserify'),
      process: require.resolve('process/browser'),
    },
  },
  mode: 'production',
}
