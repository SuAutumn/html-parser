const path = require('path')
const config = require('./webpack.config')
const VERSION = require('./util').VERSION

module.exports = {
  ...config,
  mode: 'production',
  output: {
    path: path.resolve(__dirname, '../dist'),
    filename: `htmlparser.umd.${VERSION}.js`,
    library: {
      name: 'HtmlParser',
      type: 'umd',
      export: 'default',
    },
    globalObject: 'this',
  },
}
