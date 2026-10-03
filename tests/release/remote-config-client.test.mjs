import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const remoteConfig = fs.readFileSync('apps/mobile/src/lib/remote-config.ts', 'utf8')
const app = fs.readFileSync('apps/mobile/src/App.vue', 'utf8')
const uiConfig = fs.readFileSync('apps/mobile/src/lib/ui-config-data.ts', 'utf8')
const appUpdate = fs.readFileSync('apps/mobile/src/lib/app-update.ts', 'utf8')

test('远程配置在冷启动和热启动接入，且失败不会阻断应用', () => {
  assert.match(app, /hydrateRemoteConfig\(\)\.then\(notifyMaintenanceIfNeeded\)/)
  assert.match(remoteConfig, /\.catch\(\(\) => current\)/)
  assert.match(remoteConfig, /OFFLINE_CACHE_MAX_AGE/)
  assert.match(remoteConfig, /defaultSnapshot\(\)/)
})

test('远程配置严格校验环境、版本、功能键和样式白名单', () => {
  assert.match(remoteConfig, /raw\.schemaVersion !== 1/)
  assert.match(remoteConfig, /raw\.environment !== EXPECTED_ENVIRONMENT/)
  assert.match(remoteConfig, /FEATURE_KEY_RE\.test\(key\)/)
  assert.match(remoteConfig, /COLOR_CLASS_RE\.test\(cssClass\)/)
  assert.doesNotMatch(remoteConfig, /\beval\s*\(/)
  assert.doesNotMatch(remoteConfig, /new\s+Function\s*\(/)
  assert.match(remoteConfig, /client:remote-config:v1:\$\{EXPECTED_ENVIRONMENT\}/)
  assert.match(remoteConfig, /client:maintenance:last-revision:\$\{EXPECTED_ENVIRONMENT\}/)
})

test('原 UI 配置入口统一复用远程配置快照', () => {
  assert.match(uiConfig, /hydrateRemoteConfig\(force\)/)
  assert.doesNotMatch(uiConfig, /system\/ui-config/)
})

test('版本策略覆盖 Android、iOS 与 HarmonyOS，并保留鸿蒙升级兜底', () => {
  assert.match(appUpdate, /#ifdef APP\b/)
  assert.match(appUpdate, /rawPlatform\.includes\('harmony'\) \? 'harmony'/)
  assert.match(appUpdate, /platform !== 'ios'.*platform !== 'android'.*platform !== 'harmony'/)
  assert.match(appUpdate, /#ifdef APP-HARMONY/)
  assert.match(appUpdate, /uni\.setClipboardData/)
})
