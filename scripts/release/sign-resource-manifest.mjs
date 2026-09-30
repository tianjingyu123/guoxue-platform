import { readFileSync, writeFileSync, realpathSync } from 'node:fs'
import { createPrivateKey, createHash, sign } from 'node:crypto'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { inspectNativeBoundary } from './check-resource-native-boundary.mjs'
import { inspectWgtArchive } from './check-wgt-archive.mjs'
const require = createRequire(import.meta.url)
const { assertResourceManifest, canonicalManifest } = require('../../packages/shared/dist/resource-update.js')
const [manifestPath, packagePath, outputPath] = process.argv.slice(2)
if (!manifestPath || !packagePath || !outputPath) throw new Error('用法：node sign-resource-manifest.mjs manifest.json package.wgt signed.json')
const keyPath = process.env.WGT_SIGNING_KEY_FILE
if (!keyPath) throw new Error('缺少仓库外签名密钥文件配置')
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const resolvedKeyPath = realpathSync(keyPath)
const relative = path.relative(realpathSync(root), resolvedKeyPath)
if (!relative.startsWith('..') && !path.isAbsolute(relative)) throw new Error('签名私钥不得保存在仓库内')
let keyRepository = ''
try { keyRepository = execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd: path.dirname(resolvedKeyPath), encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() } catch { /* 仓库外目录不属于 Git 工作树 */ }
if (keyRepository) throw new Error('签名私钥不得保存在任何 Git 工作树内')
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
assertResourceManifest(manifest)
const sourceSha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim()
const nativeBase = process.env.WGT_NATIVE_BASELINE
if (!nativeBase) throw new Error('必须提供已验完整包的 WGT_NATIVE_BASELINE')
if (execFileSync('git', ['status', '--porcelain', '--untracked-files=normal', '--', 'apps', 'packages', 'scripts'], { cwd: root, encoding: 'utf8' }).trim()) throw new Error('签名前必须固定干净候选源码')
const boundary = inspectNativeBoundary(nativeBase, sourceSha)
if (!boundary.compatible || boundary.nativeFingerprint !== manifest.nativeFingerprint) throw new Error('原生输入改变或指纹不匹配，禁止签发 WGT')
const bytes = readFileSync(packagePath)
inspectWgtArchive(bytes)
if (bytes.length !== manifest.byteLength || createHash('sha256').update(bytes).digest('hex') !== manifest.sha256) throw new Error('WGT文件与清单大小或哈希不匹配')
const key = createPrivateKey(readFileSync(resolvedKeyPath))
if (key.asymmetricKeyType !== 'ed25519') throw new Error('必须使用 Ed25519 签名密钥')
const signature = sign(null, Buffer.from(canonicalManifest(manifest)), key).toString('base64')
writeFileSync(outputPath, JSON.stringify({ manifest, signature }, null, 2) + '\n', { flag: 'wx' })
console.log('已生成签名清单；未上传、未发布，签名私钥未写入输出')
