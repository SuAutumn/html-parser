const PACKAGE = require('../package.json')
const Compilation = require('webpack/lib/Compilation')
const { ConcatSource } = require('webpack-sources')

exports.VERSION = PACKAGE.version

exports.banner = `/**
 * ${PACKAGE.name} ${new Date().toLocaleString()}
 * @author ${PACKAGE.author}
 * @version ${PACKAGE.version}
 * @repository ${PACKAGE.repository}
 */`

exports.MyBannerPlugin = class MyBannerPlugin {
  constructor(banner) {
    this.banner = banner
    this._name = 'MyBannerPlugin'
  }
  apply(compiler) {
    compiler.hooks.compilation.tap(this._name, (compilation) => {
      console.log('start')
      compilation.hooks.processAssets.tap(
        {
          name: this._name,
          stage: Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE_TRANSFER,
        },
        () => {
          for (const chunk of compilation.chunks) {
            for (const file of chunk.files) {
              compilation.updateAsset(file, (old) => {
                return new ConcatSource(this.banner, '\n', old)
              })
            }
          }
        }
      )
    })
    compiler.hooks.done.tap(this._name, (stat) => {
      console.log('done')
    })
  }
}
