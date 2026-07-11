/**
 * 起名工具 · 静态假数据（纯 UI 线，算法由后端/Claude Code 负责）
 * 功能对标主流起名产品并做全集：八字喜用 + 诗词出处 + 三才五格 + 音形义详批 + 重名热度 + 屏蔽字/定字
 */

/** 起名风格偏好 */
export const QIMING_STYLES = [
  { key: "classic", label: "诗词经典", desc: "取自诗经楚辞唐诗宋词，有出处可溯源" },
  { key: "steady", label: "沉稳大气", desc: "端方厚重，适合传统家风" },
  { key: "fresh", label: "清新雅致", desc: "灵动秀气，音韵柔美" },
  { key: "auspicious", label: "寓意吉祥", desc: "福禄安康，直取吉意" },
] as const

/** 定字位置 */
export const FIX_POSITIONS = [
  { key: "middle", label: "中间字" },
  { key: "last", label: "末尾字" },
] as const

/** 单字信息 */
export interface NameChar {
  char: string
  pinyin: string
  /** 声调 1-4 */
  tone: number
  wuxing: "金" | "木" | "水" | "火" | "土"
  strokes: number
  /** 字义一句话 */
  meaning: string
}

/** 候选名字（列表卡用） */
export interface NameCandidate {
  id: string
  chars: NameChar[]
  /** 综合得分 */
  score: number
  /** 音/形/义/理 分项分 */
  subScores: { yin: number; xing: number; yi: number; li: number }
  /** 寓意一句话 */
  brief: string
  /** 诗词出处（可选） */
  poem?: { source: string; quote: string }
  /** 重名热度：low 罕见 / mid 适中 / high 较多 */
  duplicate: "low" | "mid" | "high"
}

/** 单格信息（数值+五行+吉凶+数理断语+数理卦象） */
export interface GeInfo {
  value: number
  wuxing: "金" | "木" | "水" | "火" | "土"
  luck: string
  /** 五格分析断语（敢给凶断，竞品同款诚实风格） */
  judgment: string
  /** 数理卦象（如 "风火家人卦"）及断语，可选 */
  gua?: { name: string; note: string; luck: string }
}

/** 三才五格 */
export interface SancaiWuge {
  tianGe: GeInfo
  renGe: GeInfo
  diGe: GeInfo
  waiGe: GeInfo
  zongGe: GeInfo
  /** 三才配置，如 "木金土"（天/人/地 三才五行） */
  sancai: string
  sancaiLuck: "吉" | "半吉" | "凶"
  sancaiNote: string
  /** 三才配置运势（竞品同款：总论/基础运/社交运/成功运，各带吉凶） */
  sancaiFortunes: { label: string; text: string; luck: string }[]
}

/** 逐字详解（字形音义：拼音/繁体/五行/字义内涵/名言诗句） */
export interface CharExplain {
  char: string
  pinyin: string
  traditional: string
  wuxing: string
  /** 姓氏为"姓氏来源"典故，名字为"字义内涵" */
  meaning: string
  /** 名言诗句（带出处） */
  poems: { quote: string; source: string }[]
}

/** 姓名卦象（本命卦） */
export interface MingGua {
  name: string
  /** 六爻从下到上，true=阳爻 */
  lines: boolean[]
  /** 诗曰 */
  poem: string[]
  note: string
  luck: string
}

/** 名字详批 */
export interface NameDetail {
  candidate: NameCandidate
  /** 音律分析 */
  yinlv: {
    tonePattern: string
    note: string
    /** 谐音检查结论 */
    homophone: string
  }
  /** 字形分析 */
  zixing: { note: string }
  /** 八字契合（喜用补益） */
  baziFit: {
    note: string
    /** 古籍参考 */
    source: string
    quote: string
  }
  /** 三才五格 */
  sancaiWuge: SancaiWuge
  /** 生肖宜忌 */
  shengxiao: { note: string; luck: "宜" | "平" | "忌" }
  /** 重名热度说明 */
  duplicateNote: string
  /** 字形音义逐字详解（含姓氏来源+名言诗句） */
  charExplains: CharExplain[]
  /** 姓名卦象（本命卦） */
  mingGua: MingGua
  /** 合规提示（三才五格难全吉说明） */
  complianceNote: string
}

/** 命主信息（结果页头卡） */
export const sampleProfile = {
  surname: "孙",
  gender: "男" as const,
  shengxiao: "马",
  xingzuo: "天秤座",
  birthText: "1978年9月27日 2时22分（八月廿五）",
  trueSolarText: "1978年09月27日 02时13分（保定清苑区）",
  pillars: [
    { label: "年柱", shishen: "杀", gan: "戊", zhi: "午", ganWuxing: "土", zhiWuxing: "火", canggan: "丁己", nayin: "天上火" },
    { label: "月柱", shishen: "印", gan: "辛", zhi: "酉", ganWuxing: "金", zhiWuxing: "金", canggan: "辛", nayin: "石榴木" },
    { label: "日柱", shishen: "日元", gan: "壬", zhi: "辰", ganWuxing: "水", zhiWuxing: "土", canggan: "戊乙癸", nayin: "长流水" },
    { label: "时柱", shishen: "印", gan: "辛", zhi: "丑", ganWuxing: "金", zhiWuxing: "土", canggan: "己癸辛", nayin: "壁上土" },
  ],
  wuxingRatio: [
    { name: "金", pct: 43.75 },
    { name: "木", pct: 6.25 },
    { name: "水", pct: 18.75 },
    { name: "火", pct: 6.25 },
    { name: "土", pct: 25 },
  ],
  xiyong: ["木", "火"],
  xiyongNote:
    "五行并非缺什么补什么，应以八字中阴阳五行平衡为原则选取喜用。本造金旺水相，木火受克无力，取木泄水生火、火暖局制金，故推荐喜用为木、火。",
  xiyongSource: { source: "穷通宝鉴", quote: "壬水秋生，金多水浊，专用甲木，次取丙火，木火两透，富贵可期。" },
}

/** 候选名字样例（喜用木火） */
export const sampleCandidates: NameCandidate[] = [
  {
    id: "n1",
    chars: [
      { char: "孙", pinyin: "sūn", tone: 1, wuxing: "金", strokes: 10, meaning: "姓氏" },
      { char: "志", pinyin: "zhì", tone: 4, wuxing: "火", strokes: 7, meaning: "志向、抱负" },
      { char: "林", pinyin: "lín", tone: 2, wuxing: "木", strokes: 8, meaning: "树木成林，生机繁盛" },
    ],
    score: 96,
    subScores: { yin: 95, xing: 94, yi: 98, li: 96 },
    brief: "火明木秀，志存高远而根基深厚，正合喜用木火两全",
    poem: { source: "论语 · 泰伯", quote: "士不可以不弘毅，任重而道远" },
    duplicate: "mid",
  },
  {
    id: "n2",
    chars: [
      { char: "孙", pinyin: "sūn", tone: 1, wuxing: "金", strokes: 10, meaning: "姓氏" },
      { char: "沐", pinyin: "mù", tone: 4, wuxing: "水", strokes: 8, meaning: "如沐春风，润泽" },
      { char: "阳", pinyin: "yáng", tone: 2, wuxing: "火", strokes: 7, meaning: "太阳、光明" },
    ],
    score: 94,
    subScores: { yin: 96, xing: 93, yi: 95, li: 92 },
    brief: "水火既济，如沐朝阳，音律开阔明朗",
    poem: { source: "楚辞 · 九歌", quote: "暾将出兮东方，照吾槛兮扶桑" },
    duplicate: "high",
  },
  {
    id: "n3",
    chars: [
      { char: "孙", pinyin: "sūn", tone: 1, wuxing: "金", strokes: 10, meaning: "姓氏" },
      { char: "楷", pinyin: "kǎi", tone: 3, wuxing: "木", strokes: 13, meaning: "楷模、典范" },
      { char: "煊", pinyin: "xuān", tone: 1, wuxing: "火", strokes: 13, meaning: "温暖、光盛" },
    ],
    score: 93,
    subScores: { yin: 90, xing: 92, yi: 96, li: 94 },
    brief: "木火通明，为人楷模而声名煊赫",
    poem: { source: "诗经 · 小雅", quote: "高山仰止，景行行止" },
    duplicate: "low",
  },
  {
    id: "n4",
    chars: [
      { char: "孙", pinyin: "sūn", tone: 1, wuxing: "金", strokes: 10, meaning: "姓氏" },
      { char: "禄", pinyin: "lù", tone: 4, wuxing: "火", strokes: 13, meaning: "福禄、俸禄" },
      { char: "嘉", pinyin: "jiā", tone: 1, wuxing: "木", strokes: 14, meaning: "美好、嘉许" },
    ],
    score: 91,
    subScores: { yin: 89, xing: 90, yi: 93, li: 92 },
    brief: "福禄嘉美，直取吉祥，端方厚重",
    poem: { source: "诗经 · 大雅", quote: "君子万年，介尔景福" },
    duplicate: "low",
  },
  {
    id: "n5",
    chars: [
      { char: "孙", pinyin: "sūn", tone: 1, wuxing: "金", strokes: 10, meaning: "姓氏" },
      { char: "旭", pinyin: "xù", tone: 4, wuxing: "火", strokes: 6, meaning: "旭日初升" },
      { char: "程", pinyin: "chéng", tone: 2, wuxing: "木", strokes: 12, meaning: "前程、路途" },
    ],
    score: 90,
    subScores: { yin: 92, xing: 88, yi: 91, li: 89 },
    brief: "旭日东升，良材可成，朝气蓬勃",
    poem: { source: "诗经 · 邶风", quote: "旭日始旦" },
    duplicate: "mid",
  },
]

/** 详批样例（孙志林） */
export const sampleNameDetail: NameDetail = {
  candidate: sampleCandidates[0],
  yinlv: {
    tonePattern: "阴平 · 去声 · 阳平",
    note: "平仄平相间，抑扬顿挫，朗朗上口；声母 s-zh-l 发音部位错开，无拗口连读。",
    homophone: "全名及连读均无不雅谐音，方言（粤/吴/川）复核通过。",
  },
  zixing: { note: "10-7-8 画，字形疏密均衡，左右结构与上下结构错落，书写重心平稳，签名美观。" },
  baziFit: {
    note: "本造壬水生于酉月，金旺水浊，喜木火。「志」属火暖局制金，「林」属木泄水生火，二字正补喜用，木火通明之象。",
    source: "穷通宝鉴",
    quote: "壬水秋生，专用甲木，次取丙火，木火两透，富贵可期。",
  },
  sancaiWuge: {
    tianGe: {
      value: 11,
      wuxing: "木",
      luck: "大吉",
      judgment: "枯木逢春，挽回家运，春阳成育，旭日东升，富贵荣达。",
      gua: { name: "地天泰卦", note: "天地交而万物通，上下交而其志同，诸事亨通之象。", luck: "大吉" },
    },
    renGe: {
      value: 17,
      wuxing: "金",
      luck: "半吉",
      judgment: "权威刚强，意志坚定，勇往直前；惟刚过则折，宜养柔德。",
      gua: { name: "泽山咸卦", note: "感应之卦，心志相通，得人相助；但性刚者宜自省。", luck: "半吉" },
    },
    diGe: {
      value: 15,
      wuxing: "土",
      luck: "大吉",
      judgment: "福寿圆满，涵养雅量，德高望重，自成家业，富贵繁荣。",
      gua: { name: "地山谦卦", note: "谦谦君子，卑以自牧，有终之吉。", luck: "大吉" },
    },
    waiGe: {
      value: 9,
      wuxing: "水",
      luck: "凶",
      judgment: "利去劫空，兴尽凶始，穷乏困苦；然一格之凶不足定全局，喜用得力可制。",
      gua: { name: "泽风大过卦", note: "栋桡之象，负重宜慎，不宜独任大事。", luck: "不吉" },
    },
    zongGe: {
      value: 25,
      wuxing: "土",
      luck: "吉",
      judgment: "资性英敏，才能奇特，涵养性情可成大业，晚运亨通。",
      gua: { name: "雷天大壮卦", note: "刚以动故壮，正大而天地之情可见，盛运之数。", luck: "吉" },
    },
    sancai: "木金土",
    sancaiLuck: "半吉",
    sancaiNote: "人格金坐地格土，土金相生，根基稳固；总格 25 为「资性英敏」之数，晚运亨通。",
    sancaiFortunes: [
      { label: "总论", text: "奋斗有成之配置，基础安泰，得下属之助；惟天格木克人格金，长上缘分稍薄，宜以谦和处世补之。", luck: "半吉" },
      { label: "基础运", text: "人格金坐地格土，土金相生，基础坚实，一生安泰少变动。", luck: "吉" },
      { label: "社交运", text: "人格金生外格水，外智内刚，善于交际而不失原则，人缘颇佳。", luck: "吉" },
      { label: "成功运", text: "上进心足，靠自力奋斗成功；中年后运势渐旺，功名可就。", luck: "吉" },
    ],
  },
  shengxiao: {
    note: "生肖马，喜「木」字根（草木茂盛得食）、喜「火」暖局；「林」双木为马之栖息，「志」下有心，马有心则驰——用字与生肖相宜。",
    luck: "宜",
  },
  duplicateNote: "「志林」在近十年新生儿中重名率适中（每十万人约 12 例），经典而不烂大街。",
  charExplains: [
    {
      char: "孙",
      pinyin: "sūn",
      traditional: "孫",
      wuxing: "金",
      meaning:
        "姓氏来源：孙姓出自姬姓，周文王第八子康叔封于卫，其后卫武公之子惠孙，惠孙之孙武仲乙以祖父字为氏，称孙氏。又有妫姓之孙（齐田完之后孙武、孙膑）与芈姓之孙（楚孙叔敖之后），三源并流，人才辈出。",
      poems: [],
    },
    {
      char: "志",
      pinyin: "zhì",
      traditional: "志",
      wuxing: "火",
      meaning: "字义内涵：志向、意志、抱负。用作人名意指有理想、有抱负、意志坚定、心怀远大之义。",
      poems: [
        { quote: "士不可以不弘毅，任重而道远", source: "论语 · 泰伯" },
        { quote: "老骥伏枥，志在千里", source: "曹操《龟虽寿》" },
      ],
    },
    {
      char: "林",
      pinyin: "lín",
      traditional: "林",
      wuxing: "木",
      meaning: "字义内涵：成片的树木，生生不息。用作人名意指生机勃勃、根基深厚、人脉广博、蓬勃向上之义。",
      poems: [
        { quote: "独坐幽篁里，弹琴复长啸。深林人不知，明月来相照", source: "王维《竹里馆》" },
        { quote: "长风破浪会有时，直挂云帆济沧海", source: "李白《行路难》" },
      ],
    },
  ],
  mingGua: {
    name: "风山渐",
    lines: [false, false, true, false, true, true],
    poem: ["一只娇凤在山林，自由自在自高鸣。", "勤恳自学创大业，好事连连来不停。"],
    note: "风在山上，渐进之象。遇事有忍耐，具吃苦耐劳、勤勉好学之精神，循序渐进可化解种种困难，稳中有升。（吉）",
    luck: "吉",
  },
  complianceNote:
    "起名首重命局喜用神、字形字义及音律，辅以三才五格及姓名卦象作为参考。三才五格及卦象算法自身存在一定局限性，很难全吉，不必特意强求。分析内容仅供参考，不构成决策依据。",
}

/** 起名记录（记录列表显示客户全名方便从业者查找；列表不外分享无隐私问题） */
export interface QimingRecord {
  id: string
  /** 客户（家长）姓名，全名便于检索 */
  clientName: string
  surname: string
  gender: "男" | "女"
  /** 单字名 / 双字名 */
  nameType: string
  /** 已选定的名字（可选） */
  chosenName?: string
  date: string
  pinned: boolean
}

export const qimingRecords: QimingRecord[] = [
  { id: "q1", clientName: "孙建国", surname: "孙", gender: "男", nameType: "双字名", chosenName: "孙志林", date: "07-01 13:10", pinned: true },
  { id: "q2", clientName: "田淑芬", surname: "田", gender: "女", nameType: "双字名", date: "06-28 09:45", pinned: false },
  { id: "q3", clientName: "薛海峰", surname: "薛", gender: "男", nameType: "单字名", chosenName: "薛朗", date: "06-20 16:22", pinned: false },
  { id: "q4", clientName: "周晓梅", surname: "周", gender: "女", nameType: "双字名", date: "06-12 11:05", pinned: false },
]

/** 姓名解析记录（记录列表显示被解析人全名方便从业者查找；列表不外分享无隐私问题） */
export interface XingmingRecord {
  id: string
  /** 被解析人姓名（全名） */
  name: string
  gender: "男" | "女"
  /** 综合得分 */
  score: number
  date: string
  pinned: boolean
}

export const xingmingRecords: XingmingRecord[] = [
  { id: "x1", name: "孙志林", gender: "男", score: 111, date: "07-02 10:20", pinned: true },
  { id: "x2", name: "田施豪", gender: "男", score: 110, date: "07-01 15:36", pinned: false },
  { id: "x3", name: "陈婉清", gender: "女", score: 98, date: "06-27 09:12", pinned: false },
  { id: "x4", name: "李承宇", gender: "男", score: 105, date: "06-18 14:50", pinned: false },
]
