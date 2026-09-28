import { sittingGua, mingGua, mingYearOfBirth, younianStars, type Gua } from '../src/pkg-paipan3/lib/bazhai-data'
import { calculateBaZhai } from '../../../apps/server/src/modules/tool-registry/calculators/bazhai.calculator'
import { getNianZhuYear } from '../../../packages/bazi-engine/src/jieqi'

const currentYear = new Date().getFullYear()
let chartCount = 0
let boundaryCount = 0

for (let year = 1900; year <= currentYear; year++) {
  for (const gender of ['male', 'female'] as const) {
    for (let sitting = 0; sitting < 24; sitting++) {
      const zhai = sittingGua(sitting)
      const ming = mingGua(year, gender)
      const result = calculateBaZhai({ birthYear: year, gender: gender === 'male' ? '男' : '女', zuoShan: zhai })
      if (result.zhaiGua.guaName !== zhai || result.mingGua.guaName !== ming) {
        throw new Error(`八宅宅命卦不一致：${year}/${gender}/${sitting}`)
      }
      const compareStars = (actual: Array<{ direction: string; star: string }>, expected: Record<Gua, string>) =>
        actual.length === 8 && actual.every((fang) => expected[fang.direction as Gua] === fang.star)
      if (!compareStars(result.baFang, younianStars(zhai))
        || !compareStars(result.mingBaFang, younianStars(ming))) {
        throw new Error(`八宅游年星不一致：${year}/${gender}/${sitting}`)
      }
      chartCount++
    }
  }
  for (let day = 1; day <= 8; day++) {
    if (mingYearOfBirth(year, 2, day) !== getNianZhuYear(year, 2, day, 12, 0)) {
      throw new Error(`八宅立春命理年不一致：${year}-02-${day}`)
    }
    boundaryCount++
  }
}

console.log(`八宅宅命盘 ${chartCount}/${chartCount}、立春边界 ${boundaryCount}/${boundaryCount} 组一致`)
