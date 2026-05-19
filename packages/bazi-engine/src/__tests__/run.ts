/* eslint-disable no-console */
/**
 * 八字排盘引擎简单验证测试
 */
import { calcBazi } from '../index'
import type { BaziInput, ShenShaItem } from '../types'

// 测试用例：1984年2月4日 12:00 男（甲子年立春）
const testInput: BaziInput = {
  name: '测试',
  gender: '男',
  year: 1984,
  month: 2,
  day: 4,
  hour: 12,
  minute: 0,
}

console.log('========== 八字排盘引擎测试 ==========')
console.log('输入:', JSON.stringify(testInput, null, 2))

const result = calcBazi(testInput)

console.log('\n【四柱】')
console.log('  年柱:', result.siZhu.nian.gan + result.siZhu.nian.zhi,
  '十神:', result.siZhu.nian.ganShiShen,
  '纳音:', result.siZhu.nian.nayin)
console.log('  月柱:', result.siZhu.yue.gan + result.siZhu.yue.zhi,
  '十神:', result.siZhu.yue.ganShiShen,
  '纳音:', result.siZhu.yue.nayin)
console.log('  日柱:', result.siZhu.ri.gan + result.siZhu.ri.zhi,
  '十神:', result.siZhu.ri.ganShiShen,
  '纳音:', result.siZhu.ri.nayin)
console.log('  时柱:', result.siZhu.shi.gan + result.siZhu.shi.zhi,
  '十神:', result.siZhu.shi.ganShiShen,
  '纳音:', result.siZhu.shi.nayin)

console.log('\n【基本信息】')
console.log('  生肖:', result.shengXiao)
console.log('  空亡:', result.kongWang)
console.log('  旺相:', result.wangXiang)

console.log('\n【胎元】', result.taiYuan.gan + result.taiYuan.zhi, result.taiYuan.nayin)
console.log('【命宫】', result.mingGong.gan + result.mingGong.zhi, result.mingGong.nayin)
console.log('【身宫】', result.shenGong.gan + result.shenGong.zhi, result.shenGong.nayin)

console.log('\n【起运信息】')
console.log('  起运:', result.qiYun.startYear + '年' + result.qiYun.jiaoYunMonth + '月')
console.log('  起运年龄:', result.qiYun.startAge, '岁')
console.log('  距节气:', result.qiYun.dayCount, '天')
console.log('  ', result.qiYun.desc)

console.log('\n【大运】')
for (const step of result.qiYun.daYun) {
  console.log(`  ${step.ganZhi} (${step.ganShiShen}/${step.zhiShiShen}) ${step.startAge}-${step.endAge}岁 (${step.startYear}-${step.endYear}年)`)
  if (step.liuNian.length > 0) {
    const liuNianStr = step.liuNian.slice(0, 3).map(l => `${l.year}(${l.ganZhi})`).join(', ')
    console.log(`    流年前3: ${liuNianStr}...`)
  }
}

console.log('\n【合冲刑害分析】')
for (const [key, val] of Object.entries(result.fenXiTiShi)) {
  if (val.length > 0) {
    console.log(`  ${key}:`, val.join(', '))
  }
}

console.log('\n【神煞】')
const byPillar = result.shenSha.reduce((acc: Record<string, string[]>, s: ShenShaItem) => {
  const p = s.pillar === 'nian' ? '年柱' : s.pillar === 'yue' ? '月柱' : s.pillar === 'ri' ? '日柱' : '时柱'
  acc[p] = acc[p] || []
  acc[p].push(s.name + (s.type === 'ji' ? '(吉)' : '(凶)'))
  return acc
}, {})
for (const [p, names] of Object.entries(byPillar)) {
  console.log(`  ${p}:`, names.join(', '))
}

console.log('\n【格局分析】')
console.log('  格局:', result.geJu?.name)
console.log('  类型:', result.geJu?.type === 'zheng' ? '正格' : '变格')
console.log('  用神:', result.geJu?.yongShen)
console.log('  喜神:', result.geJu?.xiShen)
console.log('  忌神:', result.geJu?.jiShen)
console.log('  说明:', result.geJu?.desc)

console.log('\n【五行能量】')
const wx = result.wuXingEnergy!
console.log(`  木:${wx.mu} 火:${wx.huo} 土:${wx.tu} 金:${wx.jin} 水:${wx.shui}`)
console.log(' ', wx.desc)

console.log('\n【藏干】')
for (const [name, pillar] of Object.entries(result.siZhu)) {
  console.log(`  ${name}柱${pillar.zhi}藏:`, pillar.cangGan.map((c: { gan: string; shiShen: string }) => c.gan + c.shiShen).join(' '))
}

console.log('\n========== 测试完成 ==========')
