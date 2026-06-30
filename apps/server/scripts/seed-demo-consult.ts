/**
 * 演示数据：为"国学管理员"在两个真实圈子开通达人付费咨询服务
 * （验证个人主页"付费咨询"入口策略 B 的非空路径 + 多圈子选择）。幂等。
 */
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { PrismaClient } from '@prisma/client'

function loadEnv(p: string) {
  try {
    for (const line of readFileSync(p, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim()
    }
  } catch { /* 文件不存在则跳过 */ }
}
loadEnv(resolve(__dirname, '../.env'))
loadEnv(resolve(__dirname, '../../../.env'))

const prisma = new PrismaClient()

const SEEDS = [
  { id: 'a4dba60b-87b1-4b1c-9cfc-e546aec16246', questionPriceCoin: 88, callPricePerMinuteCoin: 20, questionTimeoutHours: 48 },  // 命理研习堂
  { id: '5e2e4e94-672a-4312-9a7f-819fbfb8531a', questionPriceCoin: 128, callPricePerMinuteCoin: 30, questionTimeoutHours: 24 }, // 易经天地
]

async function main() {
  for (const { id, ...data } of SEEDS) {
    const r = await prisma.circleMember.update({ where: { id }, data })
    console.log('OK circle=', r.circleId, 'q=', r.questionPriceCoin, 'c=', r.callPricePerMinuteCoin)
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => { console.error(e); return prisma.$disconnect().then(() => process.exit(1)) })
