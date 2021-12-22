const path = require('path')

module.exports = {
  entry: './index.js',
  optimization: {
    minimize: true,
  },
  target: 'webworker',
  output: {
    filename: 'index.js',
    path: path.resolve(__dirname, 'bin'),
    libraryTarget: 'this',
  },
}
