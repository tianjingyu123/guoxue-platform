import { execFileSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { generateKeyPairSync, sign } from 'node:crypto'
import { createRequire } from 'node:module'
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const jdk = process.env.REBU_NATIVE_JDK || 'D:/Tools/xiaozhi-build/jdk-17.0.20.1+1'
const output = path.join(root, 'artifacts/native-recovery-test')
mkdirSync(output, { recursive: true })
execFileSync(path.join(jdk, 'bin/javac.exe'), ['-encoding', 'UTF-8', '-d', output, path.join(root, 'apps/mobile/native/resource-updater/src/cn/rebu/resource/ResourceStore.java'), path.join(root, 'tests/release/native/NativeRecoveryProbe.java')], { stdio: 'inherit' })
execFileSync(path.join(jdk, 'bin/java.exe'), ['-cp', output, 'NativeRecoveryProbe'], { stdio: 'inherit' })
// 由实际 Node 签名格式生成根授权，交给实际 Java 验签；私钥仅存在内存。
const { canonicalWgtControl } = createRequire(import.meta.url)('../../packages/shared/dist/wgt-control.js')
const roots = generateKeyPairSync('ed25519'), resource = generateKeyPairSync('ed25519')
const pem = key => key.export({ type: 'spki', format: 'pem' })
const payload = { schemaVersion: 1, kind: 'resource-key', applicationId: 'rebu', keyId: 'node-key', rootKeyId: 'test-root', publicKeyPem: pem(resource.publicKey), issuedAt: new Date(Date.now() - 1000).toISOString(), expiresAt: new Date(Date.now() + 3600000).toISOString() }
const signature = sign(null, Buffer.from(canonicalWgtControl(payload)), roots.privateKey).toString('base64')
execFileSync(path.join(jdk, 'bin/java.exe'), ['-cp', output, 'NativeRecoveryProbe', 'node-signature', Buffer.from(pem(roots.publicKey)).toString('base64'), Buffer.from(payload.publicKeyPem).toString('base64'), payload.issuedAt, payload.expiresAt, signature], { stdio: 'inherit' })
