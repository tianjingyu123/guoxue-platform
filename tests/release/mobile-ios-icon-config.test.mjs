import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const mobileRoot = path.join(root, 'apps', 'mobile')
const manifest = JSON.parse(
  fs.readFileSync(path.join(mobileRoot, 'src', 'manifest.json'), 'utf8'),
)

const expected = new Map([
  ['1024x1024.png', 1024],
  ['120x120.png', 120],
  ['152x152.png', 152],
  ['167x167.png', 167],
  ['180x180.png', 180],
  ['20x20.png', 20],
  ['29x29.png', 29],
  ['40x40.png', 40],
  ['58x58.png', 58],
  ['60x60.png', 60],
  ['76x76.png', 76],
  ['80x80.png', 80],
  ['87x87.png', 87],
])

test('iOS 发布图标配置完整且 PNG 尺寸、透明通道符合要求', () => {
  const ios = manifest['app-plus']?.distribute?.icons?.ios
  assert.ok(ios, 'manifest.json 缺少 app-plus.distribute.icons.ios')
  assert.equal(ios.appstore, 'unpackage/res/icons/1024x1024.png')
  assert.equal(ios.iphone?.['app@2x'], 'unpackage/res/icons/120x120.png')
  assert.equal(ios.iphone?.['app@3x'], 'unpackage/res/icons/180x180.png')

  for (const [name, size] of expected) {
    const file = path.join(mobileRoot, 'unpackage', 'res', 'icons', name)
    const data = fs.readFileSync(file)
    assert.deepEqual(
      [...data.subarray(0, 8)],
      [137, 80, 78, 71, 13, 10, 26, 10],
      `${name} 不是 PNG`,
    )
    assert.equal(data.toString('ascii', 12, 16), 'IHDR', `${name} 缺少 IHDR`)
    assert.equal(data.readUInt32BE(16), size, `${name} 宽度错误`)
    assert.equal(data.readUInt32BE(20), size, `${name} 高度错误`)
    assert.notEqual(data[25], 4, `${name} 含透明通道`)
    assert.notEqual(data[25], 6, `${name} 含透明通道`)
  }
})
