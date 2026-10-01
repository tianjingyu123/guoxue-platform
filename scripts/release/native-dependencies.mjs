import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
import path from 'node:path'
export async function nativeCryptoDependency(root) {
  const dependency = JSON.parse(readFileSync(path.join(root, 'apps/mobile/native/resource-updater/dependencies.json'), 'utf8')).bcprov
  const file = path.join(root, 'artifacts/native-dependencies', 'bcprov-jdk15to18-' + dependency.version + '.jar')
  if (!existsSync(file)) {
    const response = await fetch(dependency.url); if (!response.ok) throw new Error('无法读取官方固定密码库依赖')
    mkdirSync(path.dirname(file), { recursive: true }); writeFileSync(file, Buffer.from(await response.arrayBuffer()))
  }
  if (createHash('sha256').update(readFileSync(file)).digest('hex') !== dependency.sha256) throw new Error('密码库依赖 SHA256 不匹配')
  return file
}
