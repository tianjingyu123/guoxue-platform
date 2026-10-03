import { readFileSync, realpathSync, writeFileSync } from 'node:fs'
import { createPrivateKey, sign } from 'node:crypto'
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const require = createRequire(import.meta.url)
const { canonicalWgtControl } = require('../../packages/shared/dist/wgt-control.js')
const [input, output] = process.argv.slice(2)
if (!input || !output) throw new Error('用法：node sign-wgt-control.mjs 已人工核验的公钥授权或证据.json signed.json')
const keyFile = process.env.WGT_CONTROL_SIGNING_KEY_FILE
if (!keyFile) throw new Error('必须配置仓库外受限根签名私钥文件，不能在聊天或仓库填写私钥')
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const resolved = realpathSync(keyFile), relative = path.relative(realpathSync(root), resolved)
if (!relative.startsWith('..') && !path.isAbsolute(relative)) throw new Error('根私钥不得保存于仓库')
let repository = ''
try { repository = execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd: path.dirname(resolved), encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() } catch { /* 非 Git 目录 */ }
if (repository) throw new Error('根私钥不得保存在任何 Git 工作树')
const payload = JSON.parse(readFileSync(input, 'utf8'))
if (payload.schemaVersion !== 1 || !['resource-key', 'native-recovery', 'channel-policy'].includes(payload.kind) || typeof payload.rootKeyId !== 'string') throw new Error('证据或授权类型非法')
if (canonicalWgtControl(payload).length > 32000) throw new Error('证据过大')
const key = createPrivateKey(readFileSync(resolved))
if (key.asymmetricKeyType !== 'ed25519') throw new Error('根签名必须为 Ed25519')
const signature = sign(null, Buffer.from(canonicalWgtControl(payload)), key).toString('base64')
writeFileSync(output, JSON.stringify({ payload, signature }, null, 2) + '\n', { flag: 'wx' })
console.log('已生成根签名文件；未提交/批准/启用。签名不替代真实证据或商店许可核验。')
