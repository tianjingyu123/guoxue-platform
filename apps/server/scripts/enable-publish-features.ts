/**
 * 启用圈子内容发布特性开关 —— content_publish(文章) / course_publish(课程)
 * FeatureFlagGuard 在开关未启用时返回 404 隐藏功能；启用后圈主/管理员可正常发文章/课程。
 * 幂等：upsert + enabled=true/percentage=100。
 * 运行：npx ts-node scripts/enable-publish-features.ts
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const flags = [
  { key: 'content_publish', name: '圈子文章发布', description: '圈主/合伙人/管理员在圈子内发布图文文章' },
  { key: 'course_publish', name: '圈子课程发布', description: '圈主/合伙人/管理员在圈子内发布课程' },
]

async function main() {
  for (const f of flags) {
    await prisma.featureFlag.upsert({
      where: { key: f.key },
      create: { key: f.key, name: f.name, description: f.description, enabled: true, percentage: 100, targetUserIds: [] },
      update: { enabled: true, percentage: 100 },
    })
    console.log(`已启用特性开关: ${f.key} (enabled=true, percentage=100)`)
  }
}

main()
  .catch((e) => {
    console.error('启用失败：', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
