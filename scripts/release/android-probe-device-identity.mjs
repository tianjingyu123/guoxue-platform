import { execFileSync } from 'node:child_process'
import path from 'node:path'

const verified = new WeakMap()
const executableFor = sdk => path.resolve(sdk, 'platform-tools/adb.exe')

/** 只读核验并保留本进程身份凭据；run 参数仅供命令适配及回归测试。 */
export function readProbeDeviceIdentity(sdk, device, { timeoutMs = 45000, run = execFileSync } = {}) {
 if (!/^[a-zA-Z0-9-]{4,80}$/.test(device) || !Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 120000) throw Error('设备或身份查询期限无效')
 const executable = executableFor(sdk)
 const read = property => run(executable, ['-s', device, 'shell', 'getprop', property], { encoding: 'utf8', timeout: timeoutMs, maxBuffer: 4096 }).trim()
 const api = read('ro.build.version.sdk'), qemu = read('ro.kernel.qemu'), abi = read('ro.product.cpu.abi')
 if (!/^\d+$/.test(api) || Number(api) < 26 || !['', '0', '1'].includes(qemu) || !['x86', 'x86_64', 'arm64-v8a', 'armeabi-v7a'].includes(abi)) throw Error('设备身份不在独立探针验证边界内')
 const identity = Object.freeze({ device, api, qemu, abi, deviceType: qemu === '1' ? 'emulator' : 'physical' })
 verified.set(identity, { executable, device })
 return identity
}

/** 不能用反序列化对象或另一设备的核验结果替代当前设备。 */
export function requireProbeDeviceIdentity(identity, sdk, device) {
 const binding = verified.get(identity)
 if (!binding || binding.executable !== executableFor(sdk) || binding.device !== device) throw Error('安装设备与本进程已核验身份不符')
 return identity
}
