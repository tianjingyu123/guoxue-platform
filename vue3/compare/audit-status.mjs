import m from './route-map.json' with { type: 'json' }

const B = m.pairs.filter((p) => p.owner === 'B')
const A = m.pairs.filter((p) => p.owner === 'A')
const other = m.pairs.filter((p) => p.owner !== 'A' && p.owner !== 'B')

console.log('=== route-map owner 分布 ===')
console.log('B(待审):', B.length, '| A(黄金):', A.length, '| 其他/未标:', other.length, '| 合计:', m.pairs.length)

function group(list) {
  const by = {}
  for (const p of list) {
    const s = p.proto.split('/')[1] || '(root)'
    ;(by[s] ||= []).push(p.proto)
  }
  return by
}

console.log('\n=== B 账号页面(按板块) ===')
for (const [k, v] of Object.entries(group(B))) console.log('  ' + k.padEnd(12), v.length, '页')

console.log('\n=== A 账号页面(按板块) ===')
for (const [k, v] of Object.entries(group(A))) console.log('  ' + k.padEnd(12), v.length, '页')

if (other.length) {
  console.log('\n=== 未标 owner ===')
  for (const p of other) console.log('  ', p.proto, '(' + (p.owner || '无') + ')')
}
