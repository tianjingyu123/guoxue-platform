import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const { APP_CHANNELS } = createRequire(import.meta.url)('../../packages/shared/dist/app-channels.js')
const sourceSha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim()
const nativeBuild = Number(JSON.parse(readFileSync(path.join(root, 'apps/mobile/src/manifest.json'), 'utf8')).versionCode)
const directory = path.join(root, 'artifacts/channel-catalog-dry-run', sourceSha)
mkdirSync(directory, { recursive: true })
const reports = []
for (const channel of APP_CHANNELS.filter(channel => channel.id !== 'legacy')) {
  for (const platform of channel.platforms) {
    const input = path.join(directory, channel.id + '-' + platform + '.json')
    writeFileSync(input, JSON.stringify({ sourceSha, productId: 'rebu', applicationId: 'rebu', platform, channelId: channel.id, clientKey: 'test-' + channel.id + '-' + platform, packageName: 'test.rebu.' + channel.id.replaceAll('-', '_'), nativeBuild, resourceVersion: 0 }))
    reports.push(JSON.parse(execFileSync(process.execPath, [path.join(root, 'scripts/release/build-channel-resources.mjs'), input, '--dry-run'], { cwd: root, encoding: 'utf8' })))
  }
}
writeFileSync(path.join(root, 'docs/operations/channel-updates-evidence/build-dry-runs.json'), JSON.stringify({ syntheticOnly: true, sourceSha, nativePackagesCompiled: false, reports }, null, 2) + '\n')
console.log('渠道/平台构建干跑 ' + reports.length + ' 组通过；没有编译/签名/上传完整原生包')
