/**
 * 排盘算法防线 · 一键全跑
 * 运行：pnpm --filter @guoxue/mobile verify   （或 npx tsx scripts/verify-all.ts）
 *
 * 这是排盘工具的回归网：任何人改动引擎/历法/数据，必须让这里全绿再提交。
 * 任一脚本失败即整体退出码非 0，可直接挂 CI。
 */
import { execFileSync } from 'node:child_process'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))

const SUITES: { file: string; desc: string }[] = [
  { file: 'verify-bazi-cross.ts', desc: '八字四柱 · 前端引擎 vs 后端 vs lunar 三方交叉（立春/晚子时/交节分界）' },
  { file: 'verify-ziwei.ts', desc: '紫微斗数 · 命身十二宫/五行局/四化/真太阳时' },
  { file: 'verify-qizheng.ts', desc: '七政四余 · VSOP87 星曜黄经/立命安身/化曜/童限大限' },
  { file: 'verify-qimen.ts', desc: '奇门遁甲 · 转盘/飞盘/阳遁阴遁/值符值使' },
  { file: 'verify-liuyao.ts', desc: '六爻 · 纳甲装卦/六亲六神/世应动爻/空亡' },
  { file: 'verify-daliuren.ts', desc: '大六壬 · 月将/天盘/四课/三传/天将（对竞品逐值）' },
  { file: 'verify-jinkoujue.ts', desc: '金口诀 · 四位/用爻/旺衰/课体' },
  { file: 'verify-hepan.ts', desc: '八字合盘 · 生肖/日柱/五行/十神/神煞加权' },
  { file: 'verify-qiming.ts', desc: '周易起名 · 三才五格/生肖宜忌/音形义打分' },
  { file: 'verify-xingming.ts', desc: '姓名解析 · 五格剖象/81 数理/三才配置' },
  { file: 'verify-zidian.ts', desc: '国学字典 · 康熙笔画/字形五行/81数理/结构/笔顺数据' },
  { file: 'verify-jieqi.ts', desc: '二十四节气 · 与 VSOP87 对撞 192 个交节点 + 跨时区' },
  { file: 'verify-wannianli.ts', desc: '万年历 · 四柱/宜忌/物候/星期' },
  { file: 'verify-lunar-convert.ts', desc: '农历→公历转换（13 个页面的输入口径）' },
  { file: 'verify-backend-parity.ts', desc: '前后端同源 · 后端 calculator 与 shared 引擎逐值一致（去伪存真防线）' },
]

let failed = 0
const results: { name: string; ok: boolean; tail: string }[] = []

for (const s of SUITES) {
  process.stdout.write(`▶ ${s.file.replace(/^verify-|\.ts$/g, '').padEnd(16)} ${s.desc}\n`)
  try {
    const out = execFileSync('npx', ['tsx', resolve(HERE, s.file)], {
      encoding: 'utf8',
      shell: process.platform === 'win32',
    })
    const tail = out.trim().split('\n').filter(Boolean).pop() ?? ''
    results.push({ name: s.file, ok: true, tail })
    console.log(`  ✅ ${tail}\n`)
  } catch (e: any) {
    failed++
    const out = String(e?.stdout ?? '') + String(e?.stderr ?? '')
    const bad = out.split('\n').filter((l) => /✗|❌|失败 [1-9]/.test(l)).slice(0, 5)
    results.push({ name: s.file, ok: false, tail: bad.join(' | ') })
    console.log(`  ❌ 失败：\n${bad.map((l) => '     ' + l).join('\n')}\n`)
  }
}

console.log('═'.repeat(60))
for (const r of results) console.log(`${r.ok ? '✅' : '❌'} ${r.name.padEnd(26)} ${r.ok ? r.tail : '失败'}`)
console.log('═'.repeat(60))
console.log(failed ? `🔴 ${failed} / ${SUITES.length} 套失败` : `✅ 全部 ${SUITES.length} 套通过`)
process.exit(failed ? 1 : 0)
