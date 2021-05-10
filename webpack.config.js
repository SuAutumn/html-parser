const path = require('path')

module.exports = {
  mode: 'development',
  target: 'node',
  entry: './src/HtmlParser.ts',
  output: {
    path: path.resolve(__dirname, 'bundle'),
    filename: 'htmlparser.bundle.js',
    libraryTarget: 'umd',
    library: {
      name: 'HtmlParser',
      type: 'assign-properties',
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
