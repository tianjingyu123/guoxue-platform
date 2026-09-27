import assert from 'node:assert/strict'
import { routeClockPart } from '../src/lib/paipan/route-clock'

// 00:00 是合法排盘时刻，不能被缺省时间覆盖；错误参数才回退。
assert.equal(routeClockPart('0', 13, 23), 0)
assert.equal(routeClockPart('00', 59, 59), 0)
assert.equal(routeClockPart('23', 13, 23), 23)
assert.equal(routeClockPart('59', 0, 59), 59)
assert.equal(routeClockPart(undefined, 13, 23), 13)
assert.equal(routeClockPart('', 59, 59), 59)
assert.equal(routeClockPart('24', 13, 23), 13)
assert.equal(routeClockPart('1.5', 13, 23), 13)

console.log('排盘路由时刻 8/8 通过')
