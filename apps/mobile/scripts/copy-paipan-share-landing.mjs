import { constants } from 'node:fs'
import { copyFile, mkdir, stat } from 'node:fs/promises'
import path from 'node:path'

const directory = path.join('pkg-common', 'legacy-paipan-share', 'index')
// 首次接收者的旧站授权无法在 iframe 内可靠完成，正式分享页只保留顶层跳转资源。
for (const [name, minimumSize] of [['index.html', 1000]]) {
  const relative = path.join(directory, name)
  const source = path.resolve('public', relative)
  const target = path.resolve('dist', 'build', 'h5', relative)
  const sourceInfo = await stat(source)
  if (!sourceInfo.isFile() || sourceInfo.size < minimumSize) {
    throw new Error(`旧排盘分享资源不存在或内容异常：${name}`)
  }
  await mkdir(path.dirname(target), { recursive: true })
  // 若编译器日后生成同路径文件，必须先人工解决冲突，不能静默覆盖。
  await copyFile(source, target, constants.COPYFILE_EXCL)
  console.log(`已加入旧排盘分享资源：${relative}`)
}
