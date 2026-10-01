#!/usr/bin/env bash
set -euo pipefail
# 仅本次CI自有模拟器；不访问生产账号、业务或服务器。
case "${PROBE_API:?}" in 31|32) ;; *) exit 2;; esac
probe_sdk="${ANDROID_HOME:?}"
probe_serial="emulator-5554"
probe_avd="rebu_linux_aosp_api${PROBE_API}"
probe_package="system-images;android-${PROBE_API};default;x86_64"
export REBU_ANDROID_SDK="$probe_sdk"
export ANDROID_AVD_HOME="$RUNNER_TEMP/rebu-native-probe-avd"
mkdir -p "$ANDROID_AVD_HOME" artifacts/android-resource-probe-39 artifacts/linux-native-probe docs/operations/channel-updates-evidence

node --input-type=module <<'NODE'
import fs from 'node:fs';
import crypto from 'node:crypto';
const manifest=JSON.parse(fs.readFileSync('.github/native-probe/aosp-inputs.json','utf8'));
for(const item of manifest.files){
 const data=fs.readFileSync(item.path);
 if(data.length!==item.bytes || crypto.createHash('sha256').update(data).digest('hex')!==item.sha256) throw Error('CI输入摘要不符：'+item.path);
}
const info=JSON.parse(fs.readFileSync('.github/native-probe/build.json','utf8'));
if(info.packageName!=='cn.rebu.resourceprobe'||!info.syntheticOnly||info.dcloud!==false||info.sha256!=='96300f12abb3561eb0d00bc00610f0d925785a501cde5ac97cb939e15c2789ea')throw Error('拒绝非合成同一探针');
info.apk='.github/native-probe/rebu-native-probe-39.apk';
fs.writeFileSync('artifacts/android-resource-probe-39/build.json',JSON.stringify(info,null,2)+'\n',{flag:'wx'});
NODE

# 先通过官方 SDK API 检查真实许可与包引用；不接受或写入许可。
curl --fail --proto '=https' --tlsv1.2 --max-time 45 https://dl.google.com/android/repository/sys-img/android/sys-img2-4.xml -o artifacts/linux-native-probe/sdk-aosp-catalog.xml
test "$(sha256sum artifacts/linux-native-probe/sdk-aosp-catalog.xml | cut -d ' ' -f1)" = fea06dcf5b6eed13d0cb9c8e06decd60dce36ac9eb3af0d2bb671edd96d77b50
mkdir -p "$RUNNER_TEMP/aosp-license-check"
javac -encoding UTF-8 -cp "$probe_sdk/cmdline-tools/latest/lib/*" -d "$RUNNER_TEMP/aosp-license-check" .github/native-probe/StandardSdkLicense.java
java -cp "$RUNNER_TEMP/aosp-license-check:$probe_sdk/cmdline-tools/latest/lib/*" StandardSdkLicense "$probe_sdk" artifacts/linux-native-probe/sdk-aosp-catalog.xml | tee artifacts/linux-native-probe/standard-license-readonly.json
test -e /dev/kvm
sudo chown "$USER" /dev/kvm
sudo chmod 600 /dev/kvm
test -r /dev/kvm && test -w /dev/kvm
"$probe_sdk/cmdline-tools/latest/bin/sdkmanager" "$probe_package" 'build-tools;35.0.0' </dev/null > artifacts/linux-native-probe/sdk-install.log 2>&1
test -x "$probe_sdk/platform-tools/adb"
test -x "$probe_sdk/build-tools/35.0.0/aapt2"
# 兼容原Windows路径命名，调用的仍是真实Linux官方工具，不改核心脚本。
test ! -e "$probe_sdk/platform-tools/adb.exe"
test ! -e "$probe_sdk/build-tools/35.0.0/aapt2.exe"
ln -s adb "$probe_sdk/platform-tools/adb.exe"
ln -s aapt2 "$probe_sdk/build-tools/35.0.0/aapt2.exe"
grep -Eq "AndroidVersion.ApiLevel[[:space:]]*=[[:space:]]*$PROBE_API" "$probe_sdk/system-images/android-$PROBE_API/default/x86_64/source.properties"
grep -Eq 'SystemImage.Abi[[:space:]]*=[[:space:]]*x86_64$' "$probe_sdk/system-images/android-$PROBE_API/default/x86_64/source.properties"
cp "$probe_sdk/system-images/android-$PROBE_API/default/x86_64/source.properties" artifacts/linux-native-probe/image-source.properties
# 真实Linux第二轮缺少 libpulse.so.0；仅在临时CI宿主安装官方发行版依赖。
test -x "$probe_sdk/emulator/emulator"
ldd "$probe_sdk/emulator/qemu/linux-x86_64/qemu-system-x86_64" > artifacts/linux-native-probe/shared-libraries-before.log 2>&1 || true
sudo apt-get update > artifacts/linux-native-probe/apt-update.log 2>&1
sudo apt-get install -y --no-install-recommends libpulse0 > artifacts/linux-native-probe/apt-install.log 2>&1
apt-cache policy libpulse0 > artifacts/linux-native-probe/libpulse-package-policy.log
ldd "$probe_sdk/emulator/qemu/linux-x86_64/qemu-system-x86_64" > artifacts/linux-native-probe/shared-libraries-after.log 2>&1
"$probe_sdk/emulator/emulator" -version > artifacts/linux-native-probe/emulator-version.log 2>&1
"$probe_sdk/emulator/emulator" -accel-check > artifacts/linux-native-probe/acceleration.log 2>&1
printf 'no\n' | "$probe_sdk/cmdline-tools/latest/bin/avdmanager" create avd -n "$probe_avd" -k "$probe_package" -p "$ANDROID_AVD_HOME/$probe_avd.avd" > artifacts/linux-native-probe/avd-create.log 2>&1
"$probe_sdk/emulator/emulator" -avd "$probe_avd" -port 5554 -accel on -gpu swiftshader_indirect -feature -Vulkan -no-window -no-audio -no-boot-anim -no-snapshot -memory 2048 -cores 2 > artifacts/linux-native-probe/emulator.log 2>&1 &
probe_pid=$!
probe_diag_pid=''
cleanup(){
 if [[ -n "$probe_diag_pid" ]]; then kill "$probe_diag_pid" 2>/dev/null || true; wait "$probe_diag_pid" 2>/dev/null || true; fi
 "$probe_sdk/platform-tools/adb" -s "$probe_serial" emu kill > artifacts/linux-native-probe/emulator-stop.log 2>&1 || true
 wait "$probe_pid" 2>/dev/null || true
}
trap cleanup EXIT
probe_deadline=$((SECONDS+480))
probe_boot=''
while (( SECONDS < probe_deadline )); do
 kill -0 "$probe_pid"
 probe_boot=$("$probe_sdk/platform-tools/adb" -s "$probe_serial" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r' || true)
 if [[ "$probe_boot" == 1 ]]; then break; fi
 sleep 5
done
test "$probe_boot" = 1
probe_actual_api=$("$probe_sdk/platform-tools/adb" -s "$probe_serial" shell getprop ro.build.version.sdk | tr -d '\r')
probe_actual_qemu=$("$probe_sdk/platform-tools/adb" -s "$probe_serial" shell getprop ro.kernel.qemu | tr -d '\r')
probe_actual_abi=$("$probe_sdk/platform-tools/adb" -s "$probe_serial" shell getprop ro.product.cpu.abi | tr -d '\r')
test "$probe_actual_api" = "$PROBE_API" && test "$probe_actual_qemu" = 1 && test "$probe_actual_abi" = x86_64
printf '{"api":%s,"qemu":true,"abi":"x86_64","flavor":"aosp-default","bootCompleted":true,"emulatorPid":%s}\n' "$PROBE_API" "$probe_pid" > artifacts/linux-native-probe/device-identity.json
"$probe_sdk/platform-tools/adb" -s "$probe_serial" logcat -v epoch -T 1 AndroidRuntime:E chromium:W '*:S' > artifacts/linux-native-probe/diagnostic.log 2>&1 &
probe_diag_pid=$!
node .github/native-probe/verify-native-probe.mjs "$probe_serial" 39 "android-phase18-api${PROBE_API}-core-retry3" --stream-logs 2>&1 | tee artifacts/linux-native-probe/core.log
node --input-type=module <<'NODE'
import fs from 'node:fs';
const evidence=JSON.parse(fs.readFileSync(`docs/operations/channel-updates-evidence/android-phase18-api${process.env.PROBE_API}-core-retry3.json`,'utf8'));
const recovery=evidence.evidence.filter(item=>item.checkpoint);
if(evidence.passed.length!==8||recovery.length!==4||recovery.some(item=>item.killedPid===item.restoredPid||!item.recoveryBeforeJs))throw Error('完整八组或四个严格恢复检查点未通过');
NODE
