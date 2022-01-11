const path = require('path')

module.exports = {
  entry: './src/index.ts',
  output: {
    filename: 'dist/worker.mjs',
    libraryTarget: 'module',
    path: path.join(__dirname, 'dist'),
  },
  devtool: 'cheap-module-source-map',
  mode: 'development',
  resolve: {
    extensions: ['.ts', '.tsx', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: 'ts-loader',
        options: {
          // transpileOnly is useful to skip typescript checks occasionally:
          transpileOnly: true,
        },
      },
    ],
  },
  experiments: {
    outputModule: true,
  },
}
