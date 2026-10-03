import { computeChart } from '../src/pkg-paipan/lib/xuankong-data'
import { computeXuankongChart } from '../../../packages/shared/src/paipan/xuankong-engine'

// 报告存盘与结果页必须是同一宅盘；覆盖九运、二十四山及起/不起替卦。
for (let period = 1; period <= 9; period++) {
  for (let sitting = 0; sitting < 24; sitting++) {
    for (const useTi of [false, true]) {
      const client = computeChart(period, sitting, useTi)
      const server = computeXuankongChart(period, sitting, useTi)
      if (JSON.stringify(client) !== JSON.stringify(server)) {
        throw new Error(`玄空前后端盘面不一致：${period} 运、坐山 ${sitting}、替卦 ${useTi}`)
      }
    }
  }
}

console.log('玄空盘面 432/432 组一致')
