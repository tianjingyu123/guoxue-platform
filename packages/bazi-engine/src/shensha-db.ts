/**
 * 神煞大全模块
 * 包含：吉神、凶煞、小儿关煞等
 * 基于传统命理经典 + 问真八字竞品分析
 */
import type { Gan, Zhi, SiZhu, ShenShaItem } from './types'
import { ZHI } from './constants'

// ==================== 吉神 ====================

/** 天乙贵人（日干/年干查） */
function getTianYiGuiRen(gan: Gan): Zhi[] {
  const map: Record<Gan, Zhi[]> = {
    '甲': ['丑','未'], '乙': ['子','申'], '丙': ['亥','酉'], '丁': ['亥','酉'],
    '戊': ['丑','未'], '己': ['子','申'], '庚': ['午','寅'], '辛': ['午','寅'],
    '壬': ['巳','卯'], '癸': ['巳','卯'],
  }
  return map[gan] || []
}

/** 天德贵人（月支查，返回天干或地支/八卦方位） */
function getTianDeGuiRen(yueZhi: Zhi): Gan | Zhi | null {
  const map: Record<Zhi, Gan | Zhi> = {
    '寅': '丁','卯': '申','辰': '壬','巳': '辛','午': '亥','未': '甲',
    '申': '癸','酉': '寅','戌': '丙','亥': '乙','子': '巳','丑': '庚',
  }
  return map[yueZhi] || null
}

/** 月德贵人（月支查） */
function getYueDeGuiRen(yueZhi: Zhi): Gan | null {
  const map: Record<Zhi, Gan> = {
    '寅': '丙','卯': '甲','辰': '壬','巳': '庚','午': '丙','未': '甲',
    '申': '壬','酉': '庚','戌': '丙','亥': '甲','子': '壬','丑': '庚',
  }
  return map[yueZhi] || null
}

/** 文昌贵人（日干查） */
function getWenChangGuiRen(riGan: Gan): Zhi | null {
  const map: Record<Gan, Zhi> = {
    '甲': '巳','乙': '午','丙': '申','丁': '酉','戊': '申',
    '己': '酉','庚': '亥','辛': '子','壬': '寅','癸': '卯',
  }
  return map[riGan] || null
}

/** 学堂（日干查） */
function getXueTang(riGan: Gan): Zhi | null {
  const map: Record<Gan, Zhi> = {
    '甲': '亥','乙': '午','丙': '寅','丁': '酉','戊': '寅',
    '己': '酉','庚': '巳','辛': '子','壬': '申','癸': '卯',
  }
  return map[riGan] || null
}

/** 福星贵人（日干查） */
function getFuXingGuiRen(riGan: Gan): Zhi | null {
  const map: Record<Gan, Zhi> = {
    '甲': '丑','乙': '巳','丙': '寅','丁': '未','戊': '巳',
    '己': '未','庚': '申','辛': '酉','壬': '丑','癸': '卯',
  }
  return map[riGan] || null
}

/** 将星（日支查） */
function getJiangXing(riZhi: Zhi): Zhi | null {
  const triads: [Zhi, Zhi, Zhi, Zhi][] = [
    ['申','子','辰','子'], ['亥','卯','未','卯'], ['寅','午','戌','午'], ['巳','酉','丑','酉'],
  ]
  for (const [a,b,c,star] of triads) {
    if (riZhi === a || riZhi === b || riZhi === c) return star
  }
  return null
}

/** 华盖（日支查） */
function getHuaGai(riZhi: Zhi): Zhi | null {
  const triads: [Zhi, Zhi, Zhi, Zhi][] = [
    ['申','子','辰','辰'], ['亥','卯','未','未'], ['寅','午','戌','戌'], ['巳','酉','丑','丑'],
  ]
  for (const [a,b,c,star] of triads) {
    if (riZhi === a || riZhi === b || riZhi === c) return star
  }
  return null
}

/** 禄神（日干查） */
function getLuShen(riGan: Gan): Zhi | null {
  const map: Record<Gan, Zhi> = {
    '甲': '寅','乙': '卯','丙': '巳','丁': '午','戊': '巳',
    '己': '午','庚': '申','辛': '酉','壬': '亥','癸': '子',
  }
  return map[riGan] || null
}

/** 金舆（日干查） */
function getJinYu(riGan: Gan): Zhi | null {
  const map: Record<Gan, Zhi> = {
    '甲': '辰','乙': '巳','丙': '未','丁': '申','戊': '未',
    '己': '申','庚': '戌','辛': '亥','壬': '丑','癸': '寅',
  }
  return map[riGan] || null
}

/** 驿马（日支查） */
function getYiMa(riZhi: Zhi): Zhi | null {
  const triads: [Zhi, Zhi, Zhi, Zhi][] = [
    ['申','子','辰','寅'], ['亥','卯','未','巳'], ['寅','午','戌','申'], ['巳','酉','丑','亥'],
  ]
  for (const [a,b,c,star] of triads) {
    if (riZhi === a || riZhi === b || riZhi === c) return star
  }
  return null
}

/** 红鸾（日支查） */
function getHongLuan(riZhi: Zhi): Zhi | null {
  const map: Record<Zhi, Zhi> = {
    '子': '卯','丑': '寅','寅': '丑','卯': '子','辰': '亥','巳': '戌',
    '午': '酉','未': '申','申': '未','酉': '午','戌': '巳','亥': '辰',
  }
  return map[riZhi] || null
}

/** 天喜（红鸾的对冲） */
function getTianXi(riZhi: Zhi): Zhi | null {
  const hl = getHongLuan(riZhi)
  if (!hl) return null
  const idx = ZHI.indexOf(hl)
  return ZHI[(idx + 6) % 12]
}

// ==================== 凶煞 ====================

/** 劫煞（日支查） */
function getJieSha(riZhi: Zhi): Zhi | null {
  const triads: [Zhi, Zhi, Zhi, Zhi][] = [
    ['申','子','辰','巳'], ['亥','卯','未','申'], ['寅','午','戌','亥'], ['巳','酉','丑','寅'],
  ]
  for (const [a,b,c,star] of triads) {
    if (riZhi === a || riZhi === b || riZhi === c) return star
  }
  return null
}

/** 灾煞（日支查） */
function getZaiSha(riZhi: Zhi): Zhi | null {
  const triads: [Zhi, Zhi, Zhi, Zhi][] = [
    ['申','子','辰','午'], ['亥','卯','未','酉'], ['寅','午','戌','子'], ['巳','酉','丑','卯'],
  ]
  for (const [a,b,c,star] of triads) {
    if (riZhi === a || riZhi === b || riZhi === c) return star
  }
  return null
}

/** 羊刃（日干查，子平派主流） */
function getYangRen(riGan: Gan): Zhi | null {
  const map: Record<Gan, Zhi> = {
    '甲': '卯','乙': '寅','丙': '午','丁': '巳','戊': '午',
    '己': '巳','庚': '酉','辛': '申','壬': '子','癸': '亥',
  }
  return map[riGan] || null
}

/** 孤辰（年支查） */
function getGuChen(nianZhi: Zhi): Zhi | null {
  const triads: [Zhi, Zhi, Zhi, Zhi][] = [
    ['亥','子','丑','寅'], ['寅','卯','辰','巳'], ['巳','午','未','申'], ['申','酉','戌','亥'],
  ]
  for (const [a,b,c,star] of triads) {
    if (nianZhi === a || nianZhi === b || nianZhi === c) return star
  }
  return null
}

/** 亡神（日支查） */
function getWangShen(riZhi: Zhi): Zhi | null {
  const triads: [Zhi, Zhi, Zhi, Zhi][] = [
    ['申','子','辰','亥'], ['亥','卯','未','寅'], ['寅','午','戌','巳'], ['巳','酉','丑','申'],
  ]
  for (const [a,b,c,star] of triads) {
    if (riZhi === a || riZhi === b || riZhi === c) return star
  }
  return null
}

/** 元辰/大耗（年支查） */
function getYuanChen(nianZhi: Zhi): Zhi | null {
  const map: Record<Zhi, Zhi> = {
    '子': '未','丑': '午','寅': '酉','卯': '申','辰': '亥','巳': '戌',
    '午': '丑','未': '子','申': '卯','酉': '寅','戌': '巳','亥': '辰',
  }
  return map[nianZhi] || null
}

/** 勾绞（日支查） */
function getGouJiao(riZhi: Zhi): Zhi[] {
  const map: Record<Zhi, [Zhi, Zhi]> = {
    '子': ['卯','酉'],'丑': ['辰','戌'],'寅': ['巳','亥'],'卯': ['午','子'],
    '辰': ['未','丑'],'巳': ['申','寅'],'午': ['酉','卯'],'未': ['戌','辰'],
    '申': ['亥','巳'],'酉': ['子','午'],'戌': ['丑','未'],'亥': ['寅','申'],
  }
  return map[riZhi] || []
}

// ==================== 汇总检测 ====================

export function calcAllShenSha(siZhu: SiZhu): ShenShaItem[] {
  const pillars: { key: string; gan: Gan; zhi: Zhi }[] = [
    { key: 'nian', gan: siZhu.nian.gan, zhi: siZhu.nian.zhi },
    { key: 'yue', gan: siZhu.yue.gan, zhi: siZhu.yue.zhi },
    { key: 'ri', gan: siZhu.ri.gan, zhi: siZhu.ri.zhi },
    { key: 'shi', gan: siZhu.shi.gan, zhi: siZhu.shi.zhi },
  ]

  const riGan = siZhu.ri.gan
  const riZhi = siZhu.ri.zhi
  const nianZhi = siZhu.nian.zhi
  const yueZhi = siZhu.yue.zhi

  // 全局神煞（不限于某柱）
  const globalShenSha: ShenShaItem[] = []

  // 天乙贵人
  const tianYiZhis = getTianYiGuiRen(riGan)
  for (const p of pillars) {
    if (tianYiZhis.includes(p.zhi)) {
      globalShenSha.push({ name: '天乙贵人', type: 'ji', desc: '逢凶化吉，贵人相助', pillar: p.key })
    }
  }

  // 天德贵人（可能是天干或地支/八卦方位）
  const tianDe = getTianDeGuiRen(yueZhi)
  if (tianDe) {
    for (const p of pillars) {
      if (p.gan === tianDe || p.zhi === tianDe) {
        globalShenSha.push({ name: '天德贵人', type: 'ji', desc: '福泽深厚，化险为夷', pillar: p.key })
      }
    }
  }

  // 月德贵人
  const yueDeGan = getYueDeGuiRen(yueZhi)
  if (yueDeGan) {
    for (const p of pillars) {
      if (p.gan === yueDeGan) {
        globalShenSha.push({ name: '月德贵人', type: 'ji', desc: '逢凶化吉，福禄双全', pillar: p.key })
      }
    }
  }

  // 文昌贵人
  const wenChang = getWenChangGuiRen(riGan)
  if (wenChang) {
    for (const p of pillars) {
      if (p.zhi === wenChang) {
        globalShenSha.push({ name: '文昌贵人', type: 'ji', desc: '聪明好学，文采出众', pillar: p.key })
      }
    }
  }

  // 学堂
  const xueTang = getXueTang(riGan)
  if (xueTang) {
    for (const p of pillars) {
      if (p.zhi === xueTang) {
        globalShenSha.push({ name: '学堂', type: 'ji', desc: '学业有成，智慧超群', pillar: p.key })
      }
    }
  }

  // 福星贵人
  const fuXing = getFuXingGuiRen(riGan)
  if (fuXing) {
    for (const p of pillars) {
      if (p.zhi === fuXing) {
        globalShenSha.push({ name: '福星贵人', type: 'ji', desc: '福寿安康，一生少病', pillar: p.key })
      }
    }
  }

  // 将星
  const jiangXing = getJiangXing(riZhi)
  if (jiangXing) {
    for (const p of pillars) {
      if (p.zhi === jiangXing) {
        globalShenSha.push({ name: '将星', type: 'ji', desc: '领导力强，权威显赫', pillar: p.key })
      }
    }
  }

  // 华盖
  const huaGai = getHuaGai(riZhi)
  if (huaGai) {
    for (const p of pillars) {
      if (p.zhi === huaGai) {
        globalShenSha.push({ name: '华盖', type: 'ji', desc: '聪慧孤独，利于艺术学术', pillar: p.key })
      }
    }
  }

  // 禄神
  const luShen = getLuShen(riGan)
  if (luShen) {
    for (const p of pillars) {
      if (p.zhi === luShen) {
        globalShenSha.push({ name: '禄神', type: 'ji', desc: '食禄丰足，生活无忧', pillar: p.key })
      }
    }
  }

  // 金舆
  const jinYu = getJinYu(riGan)
  if (jinYu) {
    for (const p of pillars) {
      if (p.zhi === jinYu) {
        globalShenSha.push({ name: '金舆', type: 'ji', desc: '富足安乐，衣食丰盛', pillar: p.key })
      }
    }
  }

  // 驿马
  const yiMa = getYiMa(riZhi)
  if (yiMa) {
    for (const p of pillars) {
      if (p.zhi === yiMa) {
        globalShenSha.push({ name: '驿马', type: 'ji', desc: '奔波行动，多动少静', pillar: p.key })
      }
    }
  }

  // 红鸾
  const hongLuan = getHongLuan(riZhi)
  if (hongLuan) {
    for (const p of pillars) {
      if (p.zhi === hongLuan) {
        globalShenSha.push({ name: '红鸾', type: 'ji', desc: '桃花运，婚恋吉兆', pillar: p.key })
      }
    }
  }

  // 天喜
  const tianXi = getTianXi(riZhi)
  if (tianXi) {
    for (const p of pillars) {
      if (p.zhi === tianXi) {
        globalShenSha.push({ name: '天喜', type: 'ji', desc: '喜事临门，婚姻美满', pillar: p.key })
      }
    }
  }

  // --- 凶煞 ---

  // 劫煞
  const jieSha = getJieSha(riZhi)
  if (jieSha) {
    for (const p of pillars) {
      if (p.zhi === jieSha) {
        globalShenSha.push({ name: '劫煞', type: 'xiong', desc: '是非破财，意外灾祸', pillar: p.key })
      }
    }
  }

  // 灾煞
  const zaiSha = getZaiSha(riZhi)
  if (zaiSha) {
    for (const p of pillars) {
      if (p.zhi === zaiSha) {
        globalShenSha.push({ name: '灾煞', type: 'xiong', desc: '疾病灾祸，意外伤害', pillar: p.key })
      }
    }
  }

  // 羊刃
  const yangRen = getYangRen(riGan)
  if (yangRen) {
    for (const p of pillars) {
      if (p.zhi === yangRen) {
        globalShenSha.push({ name: '羊刃', type: 'xiong', desc: '性情刚烈，易受伤灾', pillar: p.key })
      }
    }
  }

  // 孤辰
  const guChen = getGuChen(nianZhi)
  if (guChen) {
    for (const p of pillars) {
      if (p.zhi === guChen) {
        globalShenSha.push({ name: '孤辰', type: 'xiong', desc: '性格孤僻，婚姻不顺', pillar: p.key })
      }
    }
  }

  // 亡神
  const wangShen = getWangShen(riZhi)
  if (wangShen) {
    for (const p of pillars) {
      if (p.zhi === wangShen) {
        globalShenSha.push({ name: '亡神', type: 'xiong', desc: '心神不宁，意外灾祸', pillar: p.key })
      }
    }
  }

  // 元辰
  const yuanChen = getYuanChen(nianZhi)
  if (yuanChen) {
    for (const p of pillars) {
      if (p.zhi === yuanChen) {
        globalShenSha.push({ name: '元辰', type: 'xiong', desc: '运势反复，事多阻碍', pillar: p.key })
      }
    }
  }

  // 勾绞
  const gouJiao = getGouJiao(riZhi)
  for (const p of pillars) {
    if (gouJiao.includes(p.zhi)) {
      globalShenSha.push({ name: '勾绞', type: 'xiong', desc: '口舌是非，官非纠纷', pillar: p.key })
    }
  }

  return globalShenSha
}

/** 获取神煞分柱显示 */
export function getShenShaByPillar(
  allShenSha: ShenShaItem[]
): { nian: ShenShaItem[]; yue: ShenShaItem[]; ri: ShenShaItem[]; shi: ShenShaItem[] } {
  const result = { nian: [] as ShenShaItem[], yue: [] as ShenShaItem[], ri: [] as ShenShaItem[], shi: [] as ShenShaItem[] }
  for (const s of allShenSha) {
    if (result[s.pillar as keyof typeof result]) {
      result[s.pillar as keyof typeof result].push(s)
    }
  }
  return result
}
