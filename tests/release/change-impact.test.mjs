import assert from 'node:assert/strict'
import test from 'node:test'
import { classifyChangeImpact } from '../../scripts/release/classify-change-impact.mjs'

test('服务端修复不默认重打客户端，但强制兼容性检查', () => {
  const result = classifyChangeImpact(['apps/server/src/modules/system/version.controller.ts'])
  assert.equal(result.builds.server, true)
  assert.equal(result.nativeReleaseRequired, false)
  assert.equal(result.clientCompatibilityReviewRequired, true)
  assert.equal(result.authorizationToPublish, false)
})
test('后台改动与文档/测试改动不要求原生云打包', () => {
  const result = classifyChangeImpact(['apps/admin/src/views/Home.vue', 'docs/release.md', 'apps/mobile/src/a.spec.ts'])
  assert.equal(result.builds.admin, true)
  assert.equal(result.builds.nativeApps, false)
  assert.equal(result.testsRequired, true)
})
test('任意移动端代码/素材变化保守进入同批候选', () => {
  const result = classifyChangeImpact(['apps\\mobile\\src\\App.vue', 'apps/mobile/src/static/logo.png'])
  assert.equal(result.builds.nativeApps, true)
  assert.equal(result.builds.h5, true)
  assert.equal(result.builds.miniProgram, true)
})
test('数据库变化提示迁移评审而不授权执行', () => {
  const result = classifyChangeImpact(['apps/server/prisma/schema.prisma'])
  assert.equal(result.migrationReviewRequired, true)
  assert.equal(result.nativeReleaseRequired, false)
  assert.equal(result.authorizationToPublish, false)
})
test('依赖、构建脚本和未知路径不能被误判为内容免发版', () => {
  for (const file of ['pnpm-lock.yaml', 'packages/shared/src/index.ts', 'scripts/release/build-clients-with-env.mjs', '.env.production', '../outside.txt', 'C:/outside.txt']) {
    const result = classifyChangeImpact([file])
    assert.equal(result.nativeReleaseRequired, true, file)
    assert.equal(Object.values(result.builds).every(Boolean), true, file)
  }
})
test('删除客户端文件依然要求客户端构建，空差异也不代表正式发布授权', () => {
  const result = classifyChangeImpact(['apps/mobile/src/old.ts', 'docs/old.ts', 'docs/old.ts'])
  assert.equal(result.files.length, 2)
  assert.equal(result.nativeReleaseRequired, true)
  const empty = classifyChangeImpact([])
  assert.equal(empty.testsRequired, false)
  assert.equal(empty.authorizationToPublish, false)
})
