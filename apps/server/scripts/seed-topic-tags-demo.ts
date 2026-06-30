/**
 * 注入热门话题标签演示数据 —— 让发现/文章/编辑器的标签筛选与选择有真实可用数据。
 * 幂等：name 唯一，skipDuplicates 可重复执行。
 * 标签与品类对齐平台一级品类树，postCount 体现热度梯度（演示值，上线后由真实发帖累积覆盖）。
 * 运行：npx ts-node scripts/seed-topic-tags-demo.ts
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const tags: { name: string; category: string; postCount: number; viewCount: number }[] = [
  // 易经智慧
  { name: '易经', category: '易经智慧', postCount: 162, viewCount: 5180 },
  { name: '周易', category: '易经智慧', postCount: 74, viewCount: 2360 },
  { name: '八卦', category: '易经智慧', postCount: 41, viewCount: 1290 },
  // 国学经典
  { name: '道德经', category: '国学经典', postCount: 156, viewCount: 4920 },
  { name: '国学经典', category: '国学经典', postCount: 142, viewCount: 4510 },
  { name: '论语', category: '国学经典', postCount: 128, viewCount: 4080 },
  { name: '四书五经', category: '国学经典', postCount: 64, viewCount: 2010 },
  // 诗词歌赋
  { name: '诗词歌赋', category: '诗词歌赋', postCount: 138, viewCount: 4360 },
  { name: '唐诗', category: '诗词歌赋', postCount: 96, viewCount: 3120 },
  { name: '宋词', category: '诗词歌赋', postCount: 88, viewCount: 2780 },
  { name: '楚辞', category: '诗词歌赋', postCount: 52, viewCount: 1640 },
  // 命理
  { name: '八字命理', category: '命理', postCount: 134, viewCount: 4230 },
  { name: '紫微斗数', category: '命理', postCount: 87, viewCount: 2710 },
  { name: '风水堪舆', category: '命理', postCount: 76, viewCount: 2390 },
  // 中医养生
  { name: '中医养生', category: '中医养生', postCount: 112, viewCount: 3580 },
  { name: '节气养生', category: '中医养生', postCount: 58, viewCount: 1820 },
  // 书法绘画 / 茶道香道 / 传统文化
  { name: '书法绘画', category: '书法绘画', postCount: 49, viewCount: 1530 },
  { name: '茶道香道', category: '茶道香道', postCount: 37, viewCount: 1150 },
  { name: '传统文化', category: '国学经典', postCount: 95, viewCount: 3010 },
]

async function main() {
  const res = await prisma.topicTag.createMany({
    data: tags.map((t) => ({ ...t, status: 'ACTIVE' })),
    skipDuplicates: true,
  })
  console.log(`话题标签注入完成：新增 ${res.count} 条（共 ${tags.length} 条候选）`)
}

main()
  .catch((e) => {
    console.error('注入失败：', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
