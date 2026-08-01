// 国学字典引擎黄金回归测试
// 覆盖：康熙笔画（姓名学口径）/字形五行/81 数理吉凶/汉字结构/五音/生肖宜忌/性别/三才/统一码
//      + 选字广场筛选自洽性 + 后端注入合并（繁体/拼音/释义优先级）
// 另附：全量扫描 9574 字笔顺数据，验证 SVG path 只含 M/L/Q/C/Z 且参数个数正确（前端解析器的前置假设）
// 运行：npx tsx scripts/verify-zidian.ts

import { lookupChar, lookupText, filterChars, plazaFacets, STRUCTURE_LABEL } from '../src/pkg-paipan2/lib/zidian-engine'
import { shuliInfoOf } from '../src/pkg-paipan2/lib/xingming-engine'

let pass = 0
let fail = 0
function check(name: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual)
  const e = JSON.stringify(expected)
  if (a === e) pass++
  else {
    fail++
    console.log(`✗ ${name}\n  期望: ${e}\n  实际: ${a}`)
  }
}
function ok(name: string, cond: boolean, detail = '') {
  if (cond) pass++
  else {
    fail++
    console.log(`✗ ${name} ${detail}`)
  }
}

console.log('═══ 一、康熙笔画（姓名学口径，百家姓交叉核对）═══')
// 康熙笔画按繁体字形计，五格剖象的命门；任一错则五格全盘错
const KANGXI_CASES: [string, number][] = [
  ['李', 7], ['王', 4], ['张', 11], ['刘', 15], ['陈', 16],
  ['杨', 13], ['黄', 12], ['赵', 14], ['吴', 7], ['周', 8],
  ['一', 1], ['丁', 2], ['万', 15], ['马', 10], ['孙', 10],
]
for (const [ch, n] of KANGXI_CASES) {
  const r = lookupChar(ch)
  check(`${ch} 康熙笔画`, r?.strokesKangxi, n)
}

console.log('\n═══ 二、字形五行（部首取象）═══')
const WX_CASES: [string, string][] = [
  ['林', '木'], ['桂', '木'], ['炎', '火'], ['煌', '火'],
  ['江', '水'], ['海', '水'], ['鑫', '金'], ['铭', '金'],
  ['坤', '土'], ['城', '土'],
]
for (const [ch, wx] of WX_CASES) check(`${ch} 字形五行`, lookupChar(ch)?.wuxing, wx)

console.log('\n═══ 三、81 数理吉凶（熊崎氏灵动数）═══')
// 数理由康熙笔画直接决定：查字页展示的吉凶来源，错则误导起名。
// 先锚定数理表本身（吉凶+数名双验，防止有人改表把 34「破家之数」写成吉），再验字→数的贯通。
const SHULI_TABLE: [number, string, string][] = [
  [1, '大吉', '太极之数'], [2, '凶', '两仪之数'], [3, '大吉', '三才之数'], [4, '凶', '四象之数'],
  [5, '大吉', '五行之数'], [11, '大吉', '旱苗逢雨'], [13, '大吉', '春日牡丹'], [16, '大吉', '厚重载德'],
  [21, '大吉', '明月中天'], [24, '大吉', '掘藏得金'], [31, '大吉', '春日花开'], [33, '大吉', '旭日升天'],
  [34, '大凶', '破家之数'], [44, '凶', '烦闷之数'], [48, '大吉', '古松立鹤'], [81, '大吉', '还元之数'],
]
for (const [n, luck, name] of SHULI_TABLE) {
  const s = shuliInfoOf(n)
  check(`数理 ${n}`, [s.luck, s.name], [luck, name])
}
// 字 → 康熙笔画 → 数理 的贯通（查字页展示的就是这条链）
const SHULI_CASES: [string, string][] = [
  ['一', '大吉'], // 1 太极之数
  ['丁', '凶'], // 2 两仪之数
  ['山', '大吉'], // 3 三才之数
  ['王', '凶'], // 4 四象之数
]
for (const [ch, luck] of SHULI_CASES) {
  const r = lookupChar(ch)
  ok(`${ch}(${r?.strokesKangxi}画) 数理=${luck}`, r?.shuli.luck === luck, `实际 ${r?.shuli.luck}(${r?.shuli.name})`)
}
// 数理号必须等于康熙笔画（V0 的 shuli.num = strokesKangxi 契约）
for (const ch of ['福', '德', '瑾', '睿', '泽']) {
  const r = lookupChar(ch)!
  ok(`${ch} shuli.num == strokesKangxi`, r.shuli.num === r.strokesKangxi)
}

console.log('\n═══ 四、汉字结构（CHISE IDS）═══')
const ST_CASES: [string, string][] = [
  ['林', '左右结构'], ['明', '左右结构'],
  ['思', '上下结构'], ['泉', '上下结构'],
  ['一', '独体字'], ['人', '独体字'],
  ['国', '全包围结构'], ['困', '全包围结构'],
]
for (const [ch, st] of ST_CASES) check(`${ch} 结构`, lookupChar(ch)?.structure, st)
// 结构码必须在白名单内（否则 STRUCTURE_LABEL 会给出 undefined）
for (const ch of ['福', '德', '瑾', '睿', '泽', '萱', '梓', '昊', '熙', '岚']) {
  const r = lookupChar(ch)!
  ok(`${ch} 结构码合法`, !!STRUCTURE_LABEL[r.structureCode], r.structureCode)
}

console.log('\n═══ 五、五音（发音部位→宫商角徵羽）═══')
const YIN_CASES: [string, string][] = [
  ['高', '角'], // g → 牙音
  ['天', '徵'], // t → 舌音
  ['明', '羽'], // m → 唇音
  ['山', '商'], // sh → 齿音
  ['安', '宫'], // a → 喉音
]
for (const [ch, yin] of YIN_CASES) check(`${ch} 五音`, lookupChar(ch)?.wuyin.yin, yin)

console.log('\n═══ 六、生肖宜忌（宜忌互斥 + 已知案例）═══')
for (const ch of ['林', '禾', '肉', '心']) {
  const r = lookupChar(ch)!
  const yi = new Set(r.zodiacYi)
  const ji = new Set(r.zodiacJi.map((x) => x.zodiac))
  const overlap = [...yi].filter((z) => ji.has(z))
  ok(`${ch} 宜忌不重叠`, overlap.length === 0, `重叠 ${overlap}`)
  ok(`${ch} 忌生肖必带理由`, r.zodiacJi.every((x) => !!x.reason))
}
// 「林」草木字：兔/虎（食草栖林）宜，蛇/龙不宜——只断言宜集非空且含兔
{
  const r = lookupChar('林')!
  ok('林 宜生肖含兔', r.zodiacYi.includes('兔'), `实际 ${r.zodiacYi}`)
}

console.log('\n═══ 七、性别倾向 + 三才建议 + 统一码 ═══')
check('娟 性别', lookupChar('娟')?.genderFit.fit, '偏女性')
check('刚 性别', lookupChar('刚')?.genderFit.fit, '偏男性')
check('一 统一码', lookupChar('一')?.unicode, 'U+4E00')
check('福 统一码', lookupChar('福')?.unicode, 'U+798F')
// 三才建议必须提到「生我」与「我生」的五行，且不能把自身写成克我对象
{
  const r = lookupChar('林')! // 木
  ok('林 三才建议提到水生木', r.sancaiAdvice.includes('水生木'), r.sancaiAdvice)
  ok('林 三才建议提到木生火', r.sancaiAdvice.includes('木生火'))
  ok('林 三才建议提到木克土', r.sancaiAdvice.includes('木克土'))
}

console.log('\n═══ 八、后端注入合并（繁体/拼音/释义优先级）═══')
{
  const remote = { char: '德', traditional: '惪', pinyin: 'dé', explanation: '道德，品行；恩惠。' }
  const r = lookupChar('德', remote)!
  check('德 繁体取后端', r.traditional, '惪')
  check('德 拼音取后端', r.primaryPinyin, 'dé')
  check('德 释义取后端', r.explanation, '道德，品行；恩惠。')
  check('德 hasExplanation', r.hasExplanation, true)
  // 本地字段不受后端影响
  check('德 康熙笔画仍本地算', r.strokesKangxi, lookupChar('德')!.strokesKangxi)
}
{
  const r = lookupChar('德')! // 无后端数据
  check('德 无后端时 hasExplanation=false', r.hasExplanation, false)
  ok('德 无后端时释义为兜底文案（不编造）', r.explanation.includes('未取到'), r.explanation)
  check('德 无后端时繁体回落本字', r.traditional, '德')
  ok('德 无后端时拼音仍有值（本地离线表）', !!r.primaryPinyin)
}

console.log('\n═══ 九、多字查询 / 非法输入 ═══')
check('lookupText 逐字拆解', lookupText('张三丰').map((x) => x.char), ['张', '三', '丰'])
check('lookupText 剔除非汉字', lookupText('a张1三!').map((x) => x.char), ['张', '三'])
check('lookupText 上限 8 字', lookupText('一二三四五六七八九十').length, 8)
check('lookupChar 空串', lookupChar(''), null)
check('lookupChar 英文', lookupChar('A'), null)
check('lookupChar 数字', lookupChar('1'), null)
check('lookupChar 只取首字', lookupChar('张三')?.char, '张')

console.log('\n═══ 十、选字广场筛选自洽 ═══')
{
  const all = filterChars({})
  ok('广场默认有结果', all.length > 0, `${all.length}`)
  ok('广场默认不超上限 120', all.length <= 120)

  const mu = filterChars({ wuxing: '木' })
  ok('五行筛选全部命中木', mu.every((c) => c.wuxing === '木'), `${mu.filter((c) => c.wuxing !== '木').map((c) => c.char)}`)

  const ji = filterChars({ luck: '大吉' })
  ok('吉凶筛选全部大吉', ji.every((c) => c.shuli.luck.includes('大吉')))

  const male = filterChars({ gender: '男' })
  ok('性别筛选排除女专用字', male.every((c) => c.fit !== 'f'))

  const st = filterChars({ structure: 'L' })
  ok('结构筛选全部左右结构', st.every((c) => c.structureCode === 'L'))

  const stroke = filterChars({ strokesMin: 10, strokesMax: 12 })
  ok('笔画区间筛选', stroke.every((c) => c.strokesKangxi >= 10 && c.strokesKangxi <= 12))

  // 复合筛选 = 各单项筛选的交集（不能出现「筛得越多结果越多」这种逻辑翻车）
  const combo = filterChars({ wuxing: '水', luck: '吉' })
  ok('复合筛选同时满足', combo.every((c) => c.wuxing === '水' && c.shuli.luck.includes('吉')))
  ok('复合筛选 ⊆ 单项筛选', combo.length <= filterChars({ wuxing: '水' }).length)

  // facets 的 count 必须与实际筛选结果条数对得上（count 骗人 = UI 骗人）
  const f = plazaFacets()
  ok('facets 非空', f.structures.length > 0 && f.radicals.length > 0)
  for (const s of f.structures.slice(0, 5)) {
    const got = filterChars({ structure: s.code, limit: 9999 }).length
    ok(`facet 结构 ${s.label} count=${s.count}`, got === s.count, `实筛 ${got}`)
  }
  for (const rd of f.radicals.slice(0, 5)) {
    const got = filterChars({ radical: rd.radical, limit: 9999 }).length
    ok(`facet 部首 ${rd.radical} count=${rd.count}`, got === rd.count, `实筛 ${got}`)
  }
}

console.log('\n═══ 十一、笔顺数据全量扫描（前端 SVG 解析器的前置假设）═══')
{
  const { readdirSync, readFileSync } = require('node:fs') as typeof import('node:fs')
  const { resolve, dirname } = require('node:path') as typeof import('node:path')
  let dir = ''
  try {
    dir = dirname(require.resolve('hanzi-writer-data/package.json', { paths: ['../server', '.'] }))
  } catch {
    console.log('  （跳过：本机未安装 hanzi-writer-data devDependency）')
  }
  if (dir) {
    const files = readdirSync(dir).filter((f) => f.endsWith('.json') && f !== 'package.json')
    const cmds = new Set<string>()
    let badArgs = 0
    let noMedian = 0
    let files0 = 0
    const ARGC: Record<string, number> = { M: 2, L: 2, Q: 4, C: 6, Z: 0 }
    for (const f of files) {
      const j = JSON.parse(readFileSync(resolve(dir, f), 'utf8')) as { strokes: string[]; medians: number[][][] }
      if (!j.strokes?.length) { files0++; continue }
      if (j.medians?.length !== j.strokes.length) noMedian++
      for (const d of j.strokes) {
        const re = /([A-Za-z])([^A-Za-z]*)/g
        let m: RegExpExecArray | null
        while ((m = re.exec(d))) {
          const c = m[1].toUpperCase()
          cmds.add(c)
          const n = (m[2].match(/-?\d*\.?\d+/g) || []).length
          if (ARGC[c] === undefined || n !== ARGC[c]) badArgs++
        }
      }
    }
    console.log(`  扫描 ${files.length} 字，出现的 path 指令：${[...cmds].sort().join(',')}`)
    ok('笔顺 path 只含 M/L/Q/C/Z（解析器已全覆盖）', [...cmds].every((c) => c in ARGC), `${[...cmds]}`)
    ok('笔顺 path 参数个数全部合法', badArgs === 0, `异常 ${badArgs} 处`)
    ok('每字 medians 与 strokes 一一对应（运笔动画依赖）', noMedian === 0, `不匹配 ${noMedian} 字`)
    ok('无空笔顺数据', files0 === 0, `空 ${files0} 字`)
  }
}

console.log(`\n${'═'.repeat(40)}\n通过 ${pass} / 失败 ${fail}`)
process.exit(fail ? 1 : 0)
