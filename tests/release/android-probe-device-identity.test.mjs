import test from 'node:test'
import assert from 'node:assert/strict'
import { readProbeDeviceIdentity, requireProbeDeviceIdentity } from '../../scripts/release/android-probe-device-identity.mjs'
import { installProbe } from '../../scripts/release/android-probe-install.mjs'

const sdk = 'D:/test-sdk', device = 'emulator-5582'
const reader = (values, calls = []) => (executable, args, options) => {
 calls.push({ executable, args, options })
 return values[args.at(-1)] + '\n'
}
const values = { 'ro.build.version.sdk': '26', 'ro.kernel.qemu': '1', 'ro.product.cpu.abi': 'x86' }
test('三项只读身份查询后重复使用不再发命令，保留明确查询期限', () => {
 const calls = [], identity = readProbeDeviceIdentity(sdk, device, { timeoutMs: 120000, run: reader(values, calls) })
 assert.equal(identity.deviceType, 'emulator')
 assert.equal(requireProbeDeviceIdentity(identity, sdk, device), identity)
 assert.equal(requireProbeDeviceIdentity(identity, sdk, device), identity)
 assert.equal(calls.length, 3)
 for (const call of calls) {
  assert.deepEqual(call.args.slice(0, 4), ['-s', device, 'shell', 'getprop'])
  assert.equal(call.options.timeout, 120000)
 }
 assert.ok(Object.isFrozen(identity))
})
test('真机空qemu识别正确，不按序列号猜测设备类别', () => {
 const identity = readProbeDeviceIdentity(sdk, device, { run: reader({ ...values, 'ro.kernel.qemu': '', 'ro.product.cpu.abi': 'arm64-v8a', 'ro.build.version.sdk': '34' }) })
 assert.equal(identity.deviceType, 'physical')
})
test('另一设备、另一SDK、复制及伪造身份均在安装命令前拒绝', async () => {
 const identity = readProbeDeviceIdentity(sdk, device, { run: reader(values) })
 const info = { packageName: 'cn.rebu.resourceprobe', syntheticOnly: true, dcloud: false }
 for (const [targetSdk, targetDevice, token] of [[sdk, 'emulator-5584', identity], ['D:/other-sdk', device, identity], [sdk, device, { ...identity }], [sdk, device, {}]]) {
  await assert.rejects(installProbe(targetSdk, targetDevice, info, token), /已核验身份不符/)
 }
})
test('低API、未知qemu及未知ABI拒绝，命令错误原样传播', () => {
 for (const invalid of [{ 'ro.build.version.sdk': '25' }, { 'ro.kernel.qemu': 'unexpected' }, { 'ro.product.cpu.abi': 'unknown' }]) {
  assert.throws(() => readProbeDeviceIdentity(sdk, device, { run: reader({ ...values, ...invalid }) }), /验证边界/)
 }
 const failure = new Error('ETIMEDOUT')
 assert.throws(() => readProbeDeviceIdentity(sdk, device, { run: () => { throw failure } }), error => error === failure)
})
