// 六爻排盘静态数据（纯UI假数据，算法由后端提供）

/** 起卦方式（对齐竞品7种，用户使用习惯） */
export const QIGUA_METHODS = [
  { key: "manual", label: "手动指定" },
  { key: "coin", label: "在线摇卦" },
  { key: "guaname", label: "卦名起卦" },
  { key: "number1", label: "数字起卦1" },
  { key: "number2", label: "数字起卦2" },
  { key: "time", label: "时间起卦" },
  { key: "auto", label: "自动起卦" },
] as const

export type QiguaMethodKey = (typeof QIGUA_METHODS)[number]["key"]

/** 各起卦方式的算法说明（对齐竞品文案习惯） */
export const METHOD_NOTES: Record<QiguaMethodKey, string> = {
  manual: "手动指定六爻阴阳与动爻，适合复盘他处所得之卦。",
  coin: "请集中精力默想所占之事，点击铜钱开始旋转，再次点击可得一爻，反复六次。",
  guaname: "直接选择本卦与变卦的上下卦，适合录入已知卦例。",
  number1:
    "起卦算法：一组数字个数为偶数，则平分为二，以前一半数字之和除以8取余数得上卦，以后一半数字之和除以8取余数得下卦，上下卦数加时辰数除以6取余数为动爻数。若一组数其数字个数为奇，划分时前部分数字比后部分少一个数字。\n注：有学者认为数字起卦不属于正宗六爻起卦方法，善用者用之。",
  number2:
    "起卦算法：第1数÷8 所得余数为上卦，第2数÷8 所得余数为下卦，第3数÷6 所得余数为动爻。\n注：有学者认为数字起卦不属于正宗六爻起卦方法，善用者用之。",
  time: "起卦算法（月日数为农历）：\n上卦：（年支数+月数+日数）÷8 所得余数为上卦\n下卦：（年支数+月数+日数+时支数）÷8 所得余数为下卦\n动爻：（年支数+月数+日数+时支数）÷6 所得余数\n注：有学者认为时间起卦属于梅花易数而非正宗六爻，善用者用之。",
  auto: "注：自动起卦未必能准确反应求测者心意，仅供参考，善用者用之。",
}

/** 八卦选项（卦名起卦用） */
export const BAGUA_OPTIONS = ["乾卦 ☰", "兑卦 ☱", "离卦 ☲", "震卦 ☳", "巽卦 ☴", "坎卦 ☵", "艮卦 ☶", "坤卦 ☷"]

/** 单爻（双列：本卦列 + 变卦列） */
export interface LiuyaoResultLine {
  /** 爻位 6-1（渲染自上而下） */
  position: number
  /** 六神 */
  liushen: string
  /** 本卦：六亲+地支五行，如 "兄 子水" */
  benLiuqin: string
  /** 本卦纳甲天干，如 "癸" */
  benGan: string
  /** 本卦爻画 */
  benYao: "yang" | "yin"
  /** 世应标记 */
  shiying?: "世" | "应"
  /** 动爻标记：O→ 阳动 / X→ 阴动 */
  movingMark?: "O" | "X"
  /** 变卦：六亲+地支五行 */
  bianLiuqin: string
  /** 变卦纳甲天干 */
  bianGan: string
  /** 变卦爻画 */
  bianYao: "yang" | "yin"
  /** 伏神（红字标注于爻下），如 "伏神: 父 巳火" */
  fushen?: string
  /** 卦身标注（红字），如 "卦身为子" */
  guashenNote?: string
  /** 该爻断语（点爻弹层，超越竞品的分层交互） */
  judgment?: string
}

/** 六爻排盘结果 */
export interface LiuyaoResult {
  matter: string
  /** 排盘日期，如 "2026年07月02日 12:43 (五月十八)" */
  dateText: string
  /** 卦式，如 "【自动起卦】" */
  guaShi: string
  /** 节气范围 */
  jieqi: string
  /** 干支四柱（月、日为红字重点） */
  ganzhi: { year: string; month: string; day: string; hour: string }
  /** 各柱旬空 */
  kongwang: { year: string; month: string; day: string; hour: string }
  /** 神煞 */
  shensha: string[]
  /** 本卦名（含卦宫），如 "水泽节(坎)" */
  benGuaName: string
  /** 变卦名 */
  bianGuaName: string
  /** 本卦标注（绿字），如 "六合卦" */
  benGuaTag: string
  /** 变卦标注 */
  bianGuaTag: string
  /** 六爻（自上而下 6→1） */
  lines: LiuyaoResultLine[]
  /** 结构化断语要点（标签+文字，超越竞品的灰字堆） */
  keyNotes: { label: string; text: string }[]
  /** 卦辞爻辞（本卦/变卦切换） */
  guaci: { name: string; text: string[] }[]
  /** 传统解卦长文 */
  jieGua: { title: string; sections: { label: string; text: string }[] }
}

/** 样例：水泽节 之 震为雷（对齐竞品参考图卦例） */
export const sampleLiuyaoResult: LiuyaoResult = {
  matter: "近期洽谈的合作能否谈成",
  dateText: "2026年07月02日 12:43 (五月十八)",
  guaShi: "【自动起卦】",
  jieqi: "夏至2026.06.21 16:24 ~ 小暑2026.07.07 09:56",
  ganzhi: { year: "丙午年", month: "甲午月", day: "丁丑日", hour: "丙午时" },
  kongwang: { year: "寅卯", month: "辰巳", day: "申酉", hour: "寅卯" },
  shensha: ["卦身--子", "驿马--亥", "桃花--午", "日禄--午", "贵人--亥酉"],
  benGuaName: "水泽节(坎)",
  bianGuaName: "震为雷(震)",
  benGuaTag: "六合卦",
  bianGuaTag: "六冲卦",
  lines: [
    {
      position: 6, liushen: "龙", benLiuqin: "兄 子水", benGan: "戊", benYao: "yin",
      bianLiuqin: "官 戌土", bianGan: "庚", bianYao: "yin", guashenNote: "卦身为子",
      judgment: "上爻兄弟子水临青龙，同行朋友有助力，但也主分财之象。",
    },
    {
      position: 5, liushen: "玄", benLiuqin: "官 戌土", benGan: "戊", benYao: "yang", movingMark: "O",
      bianLiuqin: "父 申金", bianGan: "庚", bianYao: "yin",
      judgment: "五爻官鬼戌土发动化父母申金，事体有变，文书合同将有着落。",
    },
    {
      position: 4, liushen: "虎", benLiuqin: "父 申金", benGan: "戊", benYao: "yin", shiying: "应", movingMark: "X",
      bianLiuqin: "财 午火", bianGan: "庚", bianYao: "yang",
      judgment: "应爻父母申金旬空又发动化财，对方心意未定，出空之日（申酉日）可再约面谈。",
    },
    {
      position: 3, liushen: "蛇", benLiuqin: "官 丑土", benGan: "丁", benYao: "yin",
      bianLiuqin: "官 辰土", bianGan: "庚", bianYao: "yin",
      judgment: "三爻官鬼丑土临腾蛇，过程有反复缠绕之象，宜耐心周旋。",
    },
    {
      position: 2, liushen: "勾", benLiuqin: "孙 卯木", benGan: "丁", benYao: "yang", movingMark: "O",
      bianLiuqin: "孙 寅木", bianGan: "庚", bianYao: "yin", fushen: "伏神: 财 午火",
      judgment: "二爻子孙卯木发动，主消灾解忧；财爻伏藏爻下，利润条款为隐性关键。",
    },
    {
      position: 1, liushen: "雀", benLiuqin: "财 巳火", benGan: "丁", benYao: "yang", shiying: "世",
      bianLiuqin: "兄 子水", bianGan: "庚", bianYao: "yang",
      judgment: "世持妻财巳火临朱雀，我方以利为主动，口舌宣传亦有助力。",
    },
  ],
  keyNotes: [
    {
      label: "持世",
      text: "妻财持世：预测买卖、男子婚姻、财运、失物等为吉；预测父母、长辈、买房、买地等则不吉。以之为吉，则是财运亨通、失物可觅之象。",
    },
    { label: "卦象", text: "六合卦：主合，利于合作、情感，也主羁绊。变卦六冲：主散，谨防后期生变，宜速战速决。" },
    { label: "世应", text: "世应相克：主排斥、控制，不利与对方感情和合作，谈判宜多让半分。" },
    { label: "应期", text: "应爻逢空：多为对方心中不实、缺乏信心或诚意。应期看申酉日出空，本月下旬可见分晓。" },
    { label: "动爻", text: "子孙发动：主消灾、无忧之象，但问官职则不利。" },
  ],
  guaci: [
    {
      name: "本卦：水泽节",
      text: [
        "节：亨。苦节不可贞。象曰：泽上有水，节，君子以制数度，议德行。彖曰：节亨，刚柔分而刚得中。苦节不可贞，其道穷也。说以行险，当位以节，中正以通。天地节，而四时成。节以制度，不伤财，不害民。",
        "初九：不出户庭，无咎。",
        "九二：不出门庭，凶。",
        "六三：不节若，则嗟若，无咎。",
        "六四：安节，亨。",
        "九五：甘节，吉；往有尚。",
        "上六：苦节，贞凶，悔亡。",
      ],
    },
    {
      name: "变卦：震为雷",
      text: [
        "震：亨。震来虩虩，笑言哑哑。震惊百里，不丧匕鬯。象曰：洊雷，震，君子以恐惧修省。彖曰：震亨，震来虩虩，恐致福也。笑言哑哑，后有则也。",
        "初九：震来虩虩，后笑言哑哑，吉。",
        "六二：震来厉，亿丧贝，跻于九陵，勿逐，七日得。",
        "六三：震苏���，震行无眚。",
        "九四：震遂泥。",
        "六五：震往来厉，亿无丧，有事。",
        "上六：震索索，视矍矍，征凶。震不于其躬，于其邻，无咎。婚媾有言。",
      ],
    },
  ],
  jieGua: {
    title: "水泽节（节卦）万物有节 上上卦",
    sections: [
      { label: "象曰", text: "时来运转姜太公，登台封神喜气生，到此诸神皆退位，总然有祸不成凶。" },
      { label: "断曰", text: "月令高强，名声在扬，走失有信，官事无妨。" },
      {
        label: "解卦",
        text: "这个卦是异卦（下兑上坎）相叠。兑为泽，坎为水。泽有水而流有限，多必溢出于泽外。因此要有节度，故称节。节卦与涣卦相反，互为综卦，交相使用。天地有节度才能常新，国家有节度才能安稳，个人有节度才能完美。",
      },
      { label: "运势", text: "有志不能伸，诸事必须节制，不宜过份，更要戒酒色。" },
      { label: "事业", text: "正处在发展时期，一定要注意切勿冒进。但更不应放弃良好的机遇，只要坚持遵利守义的原则，可大胆行动。" },
    ],
  },
}

/** 排盘记录（六爻）。记录列表显示客户全名方便从业者查找（列表不外分享，无隐私问题；隐名仅用于盘面） */
export interface LiuyaoRecord {
  id: string
  /** 客户姓名（全名，便于从业者检索） */
  clientName: string
  /** 客户性别 */
  gender: "男" | "女"
  /** 所问事项 */
  question: string
  benGua: string
  bianGua: string
  method: string
  /** 用神一句话摘要（可选） */
  yongShenSummary?: string
  date: string
  pinned: boolean
}

export const liuyaoRecords: LiuyaoRecord[] = [
  { id: "ly1", clientName: "李承宇", gender: "男", question: "合作洽谈能否谈成", benGua: "水泽节", bianGua: "震为雷", method: "自动起卦", yongShenSummary: "妻财持世", date: "07-02 12:43", pinned: true },
  { id: "ly2", clientName: "陈婉清", gender: "女", question: "寻物", benGua: "地火明夷", bianGua: "地火明夷", method: "在线摇卦", yongShenSummary: "用神伏藏", date: "07-01 09:18", pinned: false },
  { id: "ly3", clientName: "王思远", gender: "男", question: "感情和合", benGua: "泽山咸", bianGua: "泽地萃", method: "时间起卦", yongShenSummary: "应爻生世", date: "06-29 15:02", pinned: false },
  { id: "ly4", clientName: "赵明轩", gender: "男", question: "求财", benGua: "火天大有", bianGua: "火天大有", method: "数字起卦", yongShenSummary: "财爻旺相", date: "06-27 20:40", pinned: false },
]
