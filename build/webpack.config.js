const path = require('path')
const VERSION = require('./util').VERSION

module.exports = {
  mode: 'development',
  target: 'node',
  entry: './src/HtmlParser.ts',
  output: {
    path: path.resolve(__dirname, '../dist'),
    filename: `htmlparser.bundle.${VERSION}.js`,
    library: {
      name: 'HtmlParser',
      type: 'umd',
      export: 'default',
    },
    globalObject: 'this',
  },
  resolve: {
    // Add `.ts` and `.tsx` as a resolvable extension.
    extensions: ['.ts', '.tsx', '.js'],
  },
  module: {
    rules: [{ test: /\.tsx?$/, use: 'ts-loader' }],
  },
  devtool: false,
}
