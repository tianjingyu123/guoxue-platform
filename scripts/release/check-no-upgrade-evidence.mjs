/** 免升级能力验收：必须使用同一安装包，不接受代码测试替代设备证据。 */
export const NO_UPGRADE_SCENARIOS = Object.freeze([
  'config-update', 'config-rollback', 'account-switch', 'offline-recovery', 'unsupported-schema',
])

export function checkNoUpgradeEvidence(evidence) {
  const errors = []
  const sha = value => typeof value === 'string' && /^[a-f0-9]{64}$/i.test(value)
  if (!evidence || typeof evidence !== 'object') return { passed: false, errors: ['缺少验收证据'], authorizationToPublish: false }
  if (!/^[a-f0-9]{40}$/i.test(evidence.sourceCommit || '')) errors.push('缺少完整源码 SHA')
  for (const platform of ['android', 'ios']) {
    const device = evidence.devices?.[platform]
    if (!device || !sha(device.artifactSha256)) {
      errors.push(`${platform}: 缺少安装包指纹`)
      continue
    }
    for (const scenario of NO_UPGRADE_SCENARIOS) {
      const matches = (Array.isArray(device.runs) ? device.runs : []).filter(run => run?.scenario === scenario)
      if (matches.length !== 1) { errors.push(`${platform}/${scenario}: 需要唯一场景记录`); continue }
      const run = matches[0]
      if (run.status !== 'PASS') errors.push(`${platform}/${scenario}: 尚未通过`)
      if (run.installedShaBefore !== device.artifactSha256 || run.installedShaAfter !== device.artifactSha256) {
        errors.push(`${platform}/${scenario}: 前后安装包不一致`)
      }
      if (!Number.isFinite(Date.parse(run.observedAt)) || !sha(run.evidenceSha256)) errors.push(`${platform}/${scenario}: 缺少时间或证据文件指纹`)
      if (typeof run.evidencePath !== 'string' || !run.evidencePath.trim()) errors.push(`${platform}/${scenario}: 缺少证据位置`)
      if (['config-update', 'config-rollback'].includes(scenario)) {
        if (typeof run.revisionBefore !== 'string' || !run.revisionBefore || typeof run.revisionAfter !== 'string' ||
            !run.revisionAfter || run.revisionBefore === run.revisionAfter) errors.push(`${platform}/${scenario}: 缺少实际配置版本变化`)
        if (!Number.isFinite(run.elapsedMs) || run.elapsedMs < 0) errors.push(`${platform}/${scenario}: 缺少实测生效耗时`)
      }
    }
  }
  // 本工具仅校验证据清单，不验证文件真实性，更不代替部署授权。
  return { passed: errors.length === 0, errors, authorizationToPublish: false }
}
