import assert from 'node:assert/strict'
import test from 'node:test'
import { checkNoUpgradeEvidence, NO_UPGRADE_SCENARIOS } from '../../scripts/release/check-no-upgrade-evidence.mjs'

// 全部为合成测试数据，不可用作真实上线证据。
function fixture() {
  return { sourceCommit: 'a'.repeat(40), devices: Object.fromEntries(['android', 'ios'].map(platform => [platform, {
    artifactSha256: 'b'.repeat(64), runs: NO_UPGRADE_SCENARIOS.map(scenario => ({
      scenario, status: 'PASS', installedShaBefore: 'b'.repeat(64), installedShaAfter: 'b'.repeat(64),
      observedAt: '2026-09-05T00:00:00Z', evidencePath: 'synthetic-only.json', evidenceSha256: 'c'.repeat(64),
      revisionBefore: 'before', revisionAfter: 'after', elapsedMs: 3200,
    })),
  }])) }
}
test('完整合成清单通过但不产生发布授权', () => {
  const result = checkNoUpgradeEvidence(fixture())
  assert.equal(result.passed, true)
  assert.equal(result.authorizationToPublish, false)
})
test('缺少任意平台或场景不能判绿', () => {
  for (const platform of ['android', 'ios']) {
    const data = fixture(); delete data.devices[platform]
    assert.equal(checkNoUpgradeEvidence(data).passed, false)
    for (const scenario of NO_UPGRADE_SCENARIOS) {
      const missing = fixture()
      missing.devices[platform].runs = missing.devices[platform].runs.filter(run => run.scenario !== scenario)
      assert.equal(checkNoUpgradeEvidence(missing).passed, false)
    }
  }
})
test('重新安装、未通过、重复记录、缺少指纹及无版本变化全部失败', () => {
  for (const patch of [{ installedShaAfter: 'd'.repeat(64) }, { status: 'NOT_RUN' }, { evidenceSha256: '' },
    { observedAt: 'unknown' }, { revisionAfter: 'before' }, { elapsedMs: -1 }, { evidencePath: '' }]) {
    const data = fixture(); Object.assign(data.devices.android.runs[0], patch)
    assert.equal(checkNoUpgradeEvidence(data).passed, false)
  }
  const data = fixture(); data.devices.ios.runs.push(data.devices.ios.runs[0])
  assert.equal(checkNoUpgradeEvidence(data).passed, false)
})
test('空输入及缩写源码指纹不放行', () => {
  assert.equal(checkNoUpgradeEvidence(null).passed, false)
  const data = fixture(); data.sourceCommit = 'f25b7471'
  assert.equal(checkNoUpgradeEvidence(data).passed, false)
})
