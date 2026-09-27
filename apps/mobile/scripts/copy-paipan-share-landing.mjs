import { constants } from 'node:fs'
import { copyFile, mkdir, stat } from 'node:fs/promises'
import path from 'node:path'

const relative = path.join('pkg-common', 'legacy-paipan-share', 'index', 'index.html')
const source = path.resolve('public', relative)
const target = path.resolve('dist', 'build', 'h5', relative)
const sourceInfo = await stat(source)
if (!sourceInfo.isFile() || sourceInfo.size < 1000) {
  throw new Error('旧排盘分享承接页不存在或内容异常')
}
await mkdir(path.dirname(target), { recursive: true })
// 若编译器日后生成同路径文件，必须先人工解决冲突，不能静默覆盖。
await copyFile(source, target, constants.COPYFILE_EXCL)
console.log(`已加入旧排盘分享承接页：${relative}`)
