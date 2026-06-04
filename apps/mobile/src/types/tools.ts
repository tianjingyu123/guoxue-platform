/**
 * 排盘工具类型定义
 * 严格对照 docs/v0-api-integration.md，所有字段名与后端完全一致
 */

// ==================== 基础共用类型 ====================

/** 天干地支柱 */
export interface Pillar {
  gan: string          // 天干
  zhi: string          // 地支
  ganShiShen: string   // 天干十神
  zhiShiShen: string   // 地支十神
  cangGan: string[]    // 藏干列表
  nayin: string        // 纳音
  diShi: string        // 地势（十二长生）
  ziZuo?: string       // 自坐（如"自坐禄"）
}

// ==================== 八字排盘 (toolId = "bazi") ====================

/** 八字排盘入参 */
export interface BaziInput {
  name: string
  gender: '男' | '女'
  year: number           // 公历年 1900-2100
  month: number          // 1-12
  day: number            // 1-31
  hour: number           // 0-23
  minute?: number        // 0-59
  city?: string          // 出生城市（真太阳时用）
  trueSolar?: boolean    // 真太阳时，默认 false
  ziShiMode?: 'traditional' | 'early-late'  // 早晚子时
  daylightSaving?: boolean  // 夏令时
}

/** 神煞项 */
export interface ShenShaItem {
  name: string
  type?: string
  position?: string
  description?: string
}

/** 大运步 */
export interface DaYunStep {
  ganZhi: string         // 大运干支
  tianGan: string        // 天干
  diZhi: string          // 地支
  ganShiShen: string     // 天干十神
  zhiShiShen: string     // 地支十神
  startYear: number
  endYear: number
  liuNian?: LiuNian[]    // 流年列表
}

/** 流年 */
export interface LiuNian {
  year: number
  ganZhi: string
  age: number
  ganShiShen?: string
  zhiShiShen?: string
  shenSha?: ShenShaItem[]
  /** 命理奇门中使用：流年所落宫位索引 */
  luoGongIndex?: number
  luoGongName?: string
}

/** 起运信息 */
export interface QiYun {
  startAge: number       // 起运年龄
  startYear: number      // 起运年份
  daYun: DaYunStep[]     // 大运列表
  yinYang?: string       // 阳年阴年
  shunNi?: string        // 顺逆
}

/** 格局信息 */
export interface GeJu {
  name: string
  type: string
  yongShen: string       // 用神
  xiShen: string         // 喜神
  jiShen: string         // 忌神
  desc: string
}

/** 五行能量 */
export interface WuXingEnergy {
  mu: number
  huo: number
  tu: number
  jin: number
  shui: number
  desc?: string
}

/** 分析提示（合冲刑害等） */
export interface FenXiTiShi {
  ganHe?: string
  sanHe?: string
  liuChong?: string
  liuHe?: string
  liuHai?: string
  sanXing?: string
  [key: string]: any
}

/** 流月 */
export interface LiuYue {
  month: number
  ganZhi: string
  ganShiShen?: string
  zhiShiShen?: string
}

/** 四柱 */
export interface SiZhu {
  nian: Pillar
  yue: Pillar
  ri: Pillar
  shi: Pillar
}

/** 八字排盘结果 */
export interface BaziResult {
  siZhu: SiZhu                                    // 四柱
  qiYun: QiYun                                    // 起运+大运
  shenSha: ShenShaItem[]                          // 神煞
  geJu?: GeJu                                     // 格局
  wuXingEnergy?: WuXingEnergy                     // 五行能量
  fenXiTiShi: FenXiTiShi                          // 合冲刑害分析
  kongWang: string                                // 空亡
  shengXiao: string                               // 生肖
  taiYuan: Pillar                                 // 胎元
  mingGong: Pillar                                // 命宫
  shenGong: Pillar                                // 身宫
  liuYue?: LiuYue[]                               // 流月
}

// ==================== 紫微斗数 (toolId = "ziwei") ====================

/** 紫微斗数入参 */
export interface ZiweiInput {
  name: string
  gender: '男' | '女'
  year: number
  month: number
  day: number
  hour: number
  trueSolar?: boolean
  daylightSaving?: boolean
  runYueMode?: 'as-current' | 'as-next' | 'mid-month'
  changShengMode?: 'all-shun' | 'by-year-gan' | 'by-gender'
}

/** 紫微斗数星曜 */
export interface ZiweiStar {
  name: string
  brightness: string     // 庙旺平陷
  x: number              // 宫位索引
  y: number
  isHua: boolean         // 是否四化
  huaType?: 'lu' | 'quan' | 'ke' | 'ji'
}

/** 紫微斗数宫位 */
export interface ZiweiGong {
  index: number
  name: string           // 命宫/兄弟宫/夫妻宫/子女宫/财帛宫/疾厄宫/迁移宫/交友宫/官禄宫/田宅宫/福德宫/父母宫
  tianGan: string
  diZhi: string
  stars: ZiweiStar[]
  hua?: string[]         // 四化列表
  birthDay?: string      // 纳音五行局
  mingZhu?: string       // 命主
  shenZhu?: string       // 身主
}

/** 紫微斗数结果 */
export interface ZiweiResult {
  gongs: ZiweiGong[]     // 12宫
  mingJu: string         // 命局（水二局等）
  siHua?: {
    year: string[]
    month: string[]
    day: string[]
    hour: string[]
  }
}

// ==================== 奇门共用 ====================

/** 奇门九宫 */
export interface QimenGong {
  index: number          // 1-9，[坎1, 坤2, 震3, 巽4, 中5, 乾6, 兑7, 艮8, 离9]
  name: string           // 宫名
  bagua: string          // 八卦
  diPan: string[]        // 地盘干
  tianPan: string[]      // 天盘干
  star: string           // 九星
  men: string            // 八门
  shen: string           // 八神
  yinGan?: string[]      // 隐干（阴盘奇门）
  isRuMu: boolean        // 入墓
  isJiXing: boolean      // 击刑
  isMenPo: boolean       // 门破
  changSheng?: string    // 十二长生
  kongWang: string       // 空亡
  maXing: string         // 马星
  shenSha?: string[]     // 神煞
  interpretation?: string // 解读
}

// ==================== 阳盘奇门 (toolId = "qimen-yang") ====================

/** 阳盘奇门入参 */
export interface QimenYangInput {
  datetime: string
  method?: 'zhuanpan' | 'feipan'
  qiJuMethod?: 'chaibu' | 'maoshan' | 'zhirun' | 'zixuan'
  anGanMethod?: 'zhishimen-qi' | 'men-dipan-qi'
  feiGongMode?: 'yang-shun-yin-ni' | 'yinyang-jie-shun'
  customJu?: number       // 自选局 1-9
  trueSolar?: boolean
}

/** 阳盘奇门结果 */
export interface QimenYangResult {
  juNumber: number       // 局数 1-9
  dunType: 'yang' | 'yin'
  jieQi: string          // 用事节气
  yongShi: string        // 用事时辰干支
  zhiFu: string          // 值符
  zhiShiMen: string      // 值使门
  gongs: QimenGong[]     // 九宫数组
  dipanBashen: string[]  // 地盘八神
}

// ==================== 阳盘命理奇门 (toolId = "qimen-yang-mingli") ====================

/** 阳盘命理奇门入参 */
export interface QimenYangMingliInput {
  birthTime: string
  gender: '男' | '女'
  birthplace?: string
  jiGongMode?: 'kungong' | 'yang-gen-yin-kun'
  trueSolar?: boolean
  ziShiMode?: 'traditional' | 'early-late'
  daylightSaving?: boolean
}

/** 命理奇门基础信息 */
export interface MingliBasicInfo {
  juShu: number
  dunType: string
  riGanZhi: string
  shiGanZhi: string
  gender: string
  birthplace?: string
}

/** 命理奇门命宫身宫 */
export interface MingGongInfo {
  ganZhi: string
  gan: string
  zhi: string
  gongIndex: number
  gongName: string
  star: string
  men: string
  shen: string
}

/** 命理奇门大运 */
export interface MingliDaYun {
  name: string
  ganZhi?: string
  startAge: number
  endAge: number
  startYear?: number
  endYear?: number
  juNumber?: number
  ganShiShen?: string
  zhiShiShen?: string
  liuNian?: LiuNian[]
}

/** 命理奇门格局 */
export interface MingliGeJu {
  name: string
  active: boolean
  desc: string
  jiXiong?: string
}

/** 命理奇门八字简版（用在命理奇门中内嵌的八字信息） */
export interface MingliBaziBrief {
  nian: string
  yue: string
  ri: string
  shi: string
  shengXiao: string
  kongWang: string
  wuXingEnergy: WuXingEnergy
  nianNaYin?: string
}

/** 阳盘命理奇门结果 */
export interface QimenYangMingliResult {
  basicInfo: MingliBasicInfo
  gongs: QimenGong[]              // 增强九宫
  mingLi: {
    daYun: MingliDaYun[]
    baziSwitch: { available: boolean; baziRecordId?: string }
    bazi?: MingliBaziBrief
    mingGong?: MingGongInfo        // 命宫落宫
    shenGong?: MingGongInfo        // 身宫落宫
    qiYunInfo?: { startAge: number; startYear: number; desc: string }
    liuNian?: LiuNian[]
    daYunSteps?: MingliDaYun[]
  }
  geJu: MingliGeJu[]
  duanYu: string                   // 综合断语
}

// ==================== 阴盘奇门 (toolId = "qimen-yin") ====================

/** 阴盘奇门入参 */
export interface QimenYinInput {
  datetime: string
  panType?: 'nian' | 'ri' | 'shi' | 'ke'  // 默认时盘
  customJu?: number
  trueSolar?: boolean
}

/** 阴盘奇门结果（同阳盘，增加 yinGan 隐干字段） */
export interface QimenYinResult extends QimenYangResult {
  // 继承阳盘结构，gongs 中 yinGan 字段会填充，九星/八门/八神逆排
}

// ==================== 阴盘命理奇门 (toolId = "qimen-yin-mingli") ====================

/** 阴盘命理奇门入参 */
export interface QimenYinMingliInput {
  birthTime: string
  gender: '男' | '女'
  birthplace?: string
  trueSolar?: boolean
  ziShiMode?: 'traditional' | 'early-late'
  daylightSaving?: boolean
}

/** 阴盘命理奇门结果（结构同阳盘命理，使用阴盘排盘算法） */
export interface QimenYinMingliResult extends QimenYangMingliResult {
  // 同阳盘命理结构，九星/八门/八神逆排、隐干
}

// ==================== 山向奇门 (toolId = "shanxiang-qimen") ====================

/** 山向奇门入参 */
export interface ShanXiangQiMenInput {
  zuoShan: string        // 坐山，24山之一
  xiang: string          // 朝向，24山之一
  duShu?: number         // 度数 0-15
  year?: number          // 用事年份
}

/** 山向奇门结果 */
export interface ShanXiangQiMenResult {
  // 24山72局定位、坐山朝向吉凶分析
  [key: string]: any
}

// ==================== 奇门穿壬 (toolId = "qimen-chuanren") ====================

/** 奇门穿壬入参 */
export interface QimenChuanRenInput {
  datetime: string
  method?: 'zhuanpan' | 'feipan'
  qiJuMethod?: 'chaibu' | 'maoshan' | 'zhirun'
  trueSolar?: boolean
  birthYear?: number      // 命主出生年（六壬用）
  gender?: '男' | '女'    // 性别（六壬用）
}

/** 六壬四课 */
export interface LiuRenKe {
  ganYang: string
  ganYin: string
  zhiYang: string
  zhiYin: string
  [key: string]: any
}

/** 六壬三传 */
export interface SanChuan {
  chuChuan: string
  zhongChuan: string
  moChuan: string
  [key: string]: any
}

/** 六壬课经 */
export interface KeJing {
  name: string
  description?: string
}

/** 穿壬映射 - 每支穿透详情 */
export interface ZhiAnalysis {
  zhi: string
  tianPan: string
  tianJiang: string
  dunGan: string
  liuQin: string
  inSiKe: boolean
  inSanChuan: boolean
  sanChuanPosition?: string
  isKongWang: boolean
  shenSha: string[]
  chuanJiXiong: string
  chuanDesc: string
}

/** 穿壬映射 - 九宫穿壬映射 */
export interface ChuanRenMapping {
  qimenGong: {
    index: number
    name: string
    star: string
    men: string
    shen: string
  }
  liurenZhi: string[]
  gongChuanJiXiong: string
  zhiAnalysis: ZhiAnalysis[]
  gongChuanDesc: string
}

/** 奇门穿壬断语 */
export interface ChuanRenDuanYu {
  summary: string
  overallJiXiong: string
  ju72: { name: string; star: string; men: string; tianJiang: string; jiXiong: string; desc: string }
  zhiFuAnalysis: { gongName: string; chuanZhi: string; zhiDetail: any[]; desc: string }
  perPalace: Array<{ gongName: string; star: string; men: string; shen: string; gongJiXiong: string; zhiDetail: any[]; desc: string }>
}

/** 奇门穿壬结果 */
export interface QimenChuanRenResult {
  qimen: {
    juShu: number
    dunType: string
    jieQi: string
    yongShi: string
    gongs: any[]
    zhiFu: string
    zhiShiMen: string
  }
  liuren: {
    zhanShi: string
    yueJiang: string
    dayNight: string
    riGanZhi: string
    gongs: any[]
    siKe: LiuRenKe[]
    sanChuan: SanChuan
    keJing: KeJing[]
    shenSha: string[]
    kongWang: string[]
    nianMing: string
    xingNian: string
  }
  chuanren: {
    ju72Index: number
    ju72Name: string
    ju72JiXiong: string
    ju72Desc: string
    zhiFuGongName: string
    zhiFuChuanZhi: string
    mappings: ChuanRenMapping[]
  }
  duanYu: ChuanRenDuanYu
}

// ==================== 大六壬 (toolId = "daliuren") ====================

/** 大六壬入参 */
export interface DaLiuRenInput {
  datetime: string
  birthYear: number
  gender: '男' | '女'
  liveTime: string
  jiangMethod?: 'zhongqi' | 'jiaojie'
  guiRenJue?: 'jiawugeng-niuyang' | 'jiayang-wugengniu'
  guiRenDayNight?: 'maoyou' | 'day' | 'night'
  sheHaiType?: 'mengzhongji' | 'shenqian'
  trueSolar?: boolean
}

/** 大六壬结果 */
export interface DaLiuRenResult {
  // 天地盘、四课、三传、九宗门、十二天将、64课经
  [key: string]: any
}

// ==================== 小六壬 (toolId = "xiaoliuren") ====================

/** 小六壬入参 */
export interface XiaoLiuRenInput {
  datetime: string
  type: 'daojia' | 'jiangshi' | 'jiangshi2'
  method: 'time' | 'baoshu'
  reportNumber?: number
}

/** 小六壬结果 */
export interface XiaoLiuRenResult {
  // 大安/留连/速喜/赤口/小吉/空亡六宫掌诀
  [key: string]: any
}

// ==================== 金口诀 (toolId = "jinkoujue") ====================

/** 金口诀入参 */
export interface JinKouJueInput {
  datetime: string
  diFen: string
  diFenMethod: 'select' | 'baoshu' | 'random'
  jiangMethod?: 'zhongqi' | 'jiaojie'
  guiRenJue?: 'jiawugeng-niuyang' | 'jiayang-wugengniu'
  guiRenDayNight?: 'maoyou' | 'day' | 'night'
  trueSolar?: boolean
}

/** 金口诀结果 */
export interface JinKouJueResult {
  // 人元/贵神/月将/地分四位直断
  [key: string]: any
}

// ==================== 六爻 (toolId = "liuyao") ====================

/** 六爻入参 */
export interface LiuYaoInput {
  method: 'time' | 'manual' | 'shake' | 'hex-name' | 'number-2' | 'number-3' | 'auto' | 'phone' | 'stroke'
  datetime?: string            // method=time 时
  numbers2?: number[]          // method=number-2 时 [A, B]
  numbers3?: number[]          // method=number-3 时 [A, B, C]
  hexName?: string             // method=hex-name 时 卦名
  dongYaoPositions?: number[]  // 动爻位置
}

/** 六爻结果 */
export interface LiuYaoResult {
  // 纳甲装卦、本卦/变卦/互卦、六亲、六兽、世应
  [key: string]: any
}

// ==================== 梅花易数 (toolId = "meihua") ====================

/** 梅花易数入参 */
export interface MeiHuaInput {
  method: 'time' | 'manual' | 'number' | 'auto'
  datetime?: string
  numbers?: number[]       // 报数法
  upperGua?: number        // 上卦 1-8（手动）
  lowerGua?: number        // 下卦 1-8
  dongYao?: number         // 动爻 1-6
}

/** 梅花易数结果 */
export interface MeiHuaResult {
  // 本卦/变卦/互卦、体用生克、策轨元会运世
  [key: string]: any
}

// ==================== 小成图 (toolId = "xiaochengtu") ====================

/** 小成图入参 */
export interface XiaoChengTuInput {
  method: 'shici' | 'baoshu' | 'zimu' | 'random'
  datetime?: string
  numbers?: number[]
  chars?: string
  question?: string
}

/** 小成图结果 */
export interface XiaoChengTuResult {
  [key: string]: any
}

// ==================== 金钱课 (toolId = "jinqianke") ====================

/** 金钱课入参 */
export interface JinQianKeInput {
  method: 'shoutou' | 'baoshu' | 'random'
  datetime?: string
  question?: string
}

/** 金钱课结果 */
export interface JinQianKeResult {
  // 64卦卦辞、爻辞、变卦互卦
  [key: string]: any
}

// ==================== 诸葛神数 (toolId = "zhugeshenshu") ====================

/** 诸葛神数入参 */
export interface ZhuGeShenShuInput {
  method: 'sanzi' | 'baoshu' | 'random'
  chars?: string
  numbers?: number[]
  question?: string
}

/** 诸葛神数结果 */
export interface ZhuGeShenShuResult {
  // 384签文、折十法推演、签诗解读
  [key: string]: any
}

// ==================== 孔明神卦 (toolId = "kongmingshengua") ====================

/** 孔明神卦入参 */
export interface KongMingShenGuaInput {
  method: 'shici' | 'baoshu' | 'random'
  datetime?: string
  number?: number
  trigger?: string
  question?: string
}

/** 孔明神卦结果 */
export interface KongMingShenGuaResult {
  // 周易64卦解签
  [key: string]: any
}

// ==================== 玄空飞星 (toolId = "xuankong-feixing") ====================

/** 玄空飞星入参 */
export interface XuanKongFeiXingInput {
  shan: string           // 坐山 24山
  xiang: string          // 朝向 24山
  year: number           // 建造年份
  yuanYun?: number       // 元运 1-9
  tiGua?: boolean        // 替卦
}

/** 玄空飞星结果 */
export interface XuanKongFeiXingResult {
  // 运盘/山盘/向盘/飞星/组合分析/格局
  [key: string]: any
}

// ==================== 八宅风水 (toolId = "bazhai") ====================

/** 八宅风水入参 */
export interface BaZhaiInput {
  birthYear: number
  gender: '男' | '女'
  zuoShan: '坎' | '坤' | '震' | '巽' | '乾' | '兑' | '艮' | '离'
  liuNian?: boolean
  liuNianYear?: number
}

/** 八宅风水结果 */
export interface BaZhaiResult {
  // 命卦/东西四宅/八方吉凶/大游年
  [key: string]: any
}

// ==================== 电子罗盘 (toolId = "dianzi-luopan") ====================

/** 电子罗盘入参 */
export interface DianZiLuoPanInput {
  type: 'sanhe' | 'sanyuan' | 'zonghe'
  degree?: number
  magneticCorrection?: boolean
  longitude?: number
  latitude?: number
  buildYear?: number
}

/** 电子罗盘结果 */
export interface DianZiLuoPanResult {
  // 24山方位、纳甲、三合水口、罗盘分层数据
  [key: string]: any
}

// ==================== 立极尺 (toolId = "liji-chi") ====================

/** 立极尺入参 */
export interface LiJiChiInput {
  chiType: 'luban' | 'dinglan' | 'mengong' | 'yacun'
  lengthCm: number
  usage?: string
  batch?: boolean
}

/** 立极尺结果 */
export interface LiJiChiResult {
  // 四尺吉利尺寸/压白/门公尺推算
  [key: string]: any
}

// ==================== 山向地图 (toolId = "shanxiang-ditu") ====================

/** 山向地图入参 */
export interface ShanXiangDiTuInput {
  longitude: number
  latitude: number
  direction: number
  zoom?: number
  showShanOverlay?: boolean
  showJiuGong?: boolean
  buildYear?: number
}

/** 山向地图结果 */
export interface ShanXiangDiTuResult {
  // 山向计算+图层数据
  [key: string]: any
}

// ==================== 太乙神数 (toolId = "taiyi") ====================

/** 太乙神数入参 */
export interface TaiYiInput {
  datetime: string
  shiType: '年计' | '月计' | '日计' | '时计'
  yangDun?: boolean
}

/** 太乙神数结果 */
export interface TaiYiResult {
  // 五元六纪、十六神盘、三算八将
  [key: string]: any
}

// ==================== 七政四余 (toolId = "qizheng-siyu") ====================

/** 七政四余入参 */
export interface QiZhengSiYuInput {
  datetime: string
  gender: '男' | '女'
  longitude?: number
  latitude?: number
  trueSolar?: boolean
  system?: 'guolao' | 'dongwei'
}

/** 七政四余结果 */
export interface QiZhengSiYuResult {
  // 十一曜/二十八宿/命宫十二宫/洞微大限
  [key: string]: any
}

// ==================== 五运六气 (toolId = "wuyun-liuqi") ====================

/** 五运六气入参 */
export interface WuYunLiuQiInput {
  year: number
  showProcess?: boolean
  currentDate?: string
}

/** 五运六气结果 */
export interface WuYunLiuQiResult {
  // 天干化运/地支化气/司天在泉/病候养生
  [key: string]: any
}

// ==================== 起名工具 (toolId = "qiming") ====================

/** 起名工具入参 */
export interface QiMingInput {
  surname: string
  gender: '男' | '女'
  datetime: string
  mode?: 'auto' | 'manual' | 'fix'
  methods?: string[]       // wuge/bazi-yongshen/shengxiao/yinyang-wuxing/zhouyi-gua/yinyun/ziyi/sancai/shici/kangxi/liushu
  nameLength?: 1 | 2
  style?: '古典' | '现代' | '诗词' | '国学'
  count?: number
}

/** 起名工具结果 */
export interface QiMingResult {
  // 多流派起名方案
  [key: string]: any
}

// ==================== 姓名解析 (toolId = "xingming-jiexi") ====================

/** 姓名解析入参 */
export interface XingMingJieXiInput {
  surname: string
  givenName: string
  kangXiStrokes?: boolean
  gender?: '男' | '女'
}

/** 姓名解析结果 */
export interface XingMingJieXiResult {
  // 天/人/地/总/外格、三才配置、81数理吉凶
  [key: string]: any
}

// ==================== 飞宫小奇门 (toolId = "feigong-xiaoqimen") ====================

/** 飞宫小奇门入参 */
export interface FeiGongXiaoQiMenInput {
  method: 'shichen' | 'baoshu' | 'random'
  datetime?: string
  number?: number
  question?: string
}

/** 飞宫小奇门结果 */
export interface FeiGongXiaoQiMenResult {
  // 九宫飞布、星门组合
  [key: string]: any
}

// ==================== 手机号分析 (toolId = "shoujihao-fenxi") ====================

/** 手机号分析入参 */
export interface ShouJiHaoFenXiInput {
  phone: string
  system?: 'energy' | 'wuxing' | 'bagua' | 'all'
  birthday?: string    // 生辰（选填，匹配度分析用）
  gender?: '男' | '女'
}

/** 手机号分析结果 */
export interface ShouJiHaoFenXiResult {
  // 八星磁场、81数理、阴阳五行、靓号识别
  [key: string]: any
}

// ==================== 万年历·择吉 (toolId = "wannianli") ====================

/** 万年历·择吉入参 */
export interface WanNianLiInput {
  date: string
  rangeType?: 'day' | 'month' | 'range'
  endDate?: string
  shiXiang?: string[]     // 择吉事项
  zeJiMethods?: string[]  // 择吉方法
  bazi?: string           // 个人八字
}

/** 万年历·择吉结果 */
export interface WanNianLiResult {
  // 黄历宜忌、建除、二十八宿、神煞、节气
  [key: string]: any
}

// ==================== 康熙字典 (toolId = "kangxi-zidian") ====================

/** 康熙字典入参 */
export interface KangXiZiDianInput {
  queryType: 'char' | 'pinyin' | 'radical' | 'stroke' | 'wuxing'
  query: string
  wuXingFilter?: '金' | '木' | '水' | '火' | '土'
  strokeMin?: number
  strokeMax?: number
}

/** 康熙字典结果 */
export interface KangXiZiDianResult {
  [key: string]: any
}

// ==================== 汉字筛选 (toolId = "hanzi-shaixuan") ====================

/** 汉字筛选入参 */
export interface HanZiShaiXuanInput {
  wuXing?: '金' | '木' | '水' | '火' | '土'
  strokeMin?: number
  strokeMax?: number
  radical?: string
  tone?: number[]
  meaningKeyword?: string
  commonOnly?: boolean
  nameOnly?: boolean
  zodiac?: string
  sortBy?: 'stroke' | 'pinyin' | 'frequency' | 'wuxing'
}

/** 汉字筛选结果 */
export interface HanZiShaiXuanResult {
  [key: string]: any
}

// ==================== 计算响应统一格式 ====================

/** 计算类工具统一响应（从 ApiResponse.data.result 中取出） */
export interface CalculateResponse<T = unknown> {
  toolId: string
  result: T
  durationMs: number
}

// ==================== 工具目录 ====================

/** 工具分类 */
export interface ToolCategory {
  name: string
  tools: ToolItem[]
}

/** 工具项 */
export interface ToolItem {
  toolId: string
  name: string
  description: string
  icon?: string
  badge?: string | null
  color?: string
}

/** 工具目录响应 */
export interface ToolsDirectoryResponse {
  categories: ToolCategory[]
}

/** 输入字段定义 */
export interface InputField {
  type: 'string' | 'number' | 'enum' | 'datetime' | 'boolean' | 'date' | 'time'
  label: string
  placeholder?: string
  required?: boolean
  values?: Array<{ value: string; label: string }>
  min?: number
  max?: number
  default?: string | number | boolean
}

/** 输入 Schema */
export interface InputSchema {
  type: 'object'
  properties: Record<string, InputField>
  required: string[]
}

// ==================== 排盘记录相关 ====================

/** 八字排盘记录 */
export interface BaziRecord {
  id: string
  name: string
  gender: '男' | '女'
  birthDate: string
  birthHour: number
  city?: string
  createdAt: string
}

/** 紫微排盘记录 */
export interface ZiweiRecord {
  id: string
  name: string
  gender: '男' | '女'
  birthDate: string
  birthHour: number
  createdAt: string
}

// ==================== 排盘 API 入参联合类型 ====================

/** 所有排盘入参的联合类型 */
export type ToolInput =
  | BaziInput
  | ZiweiInput
  | QimenYangInput
  | QimenYangMingliInput
  | QimenYinInput
  | QimenYinMingliInput
  | ShanXiangQiMenInput
  | QimenChuanRenInput
  | DaLiuRenInput
  | XiaoLiuRenInput
  | JinKouJueInput
  | LiuYaoInput
  | MeiHuaInput
  | XiaoChengTuInput
  | JinQianKeInput
  | ZhuGeShenShuInput
  | KongMingShenGuaInput
  | XuanKongFeiXingInput
  | BaZhaiInput
  | DianZiLuoPanInput
  | LiJiChiInput
  | ShanXiangDiTuInput
  | TaiYiInput
  | QiZhengSiYuInput
  | WuYunLiuQiInput
  | QiMingInput
  | XingMingJieXiInput
  | FeiGongXiaoQiMenInput
  | ShouJiHaoFenXiInput
  | WanNianLiInput
  | KangXiZiDianInput
  | HanZiShaiXuanInput

/** 所有排盘结果类型映射（toolId -> result type） */
export interface ToolResultMap {
  bazi: BaziResult
  ziwei: ZiweiResult
  'qimen-yang': QimenYangResult
  'qimen-yang-mingli': QimenYangMingliResult
  'qimen-yin': QimenYinResult
  'qimen-yin-mingli': QimenYinMingliResult
  'shanxiang-qimen': ShanXiangQiMenResult
  'qimen-chuanren': QimenChuanRenResult
  daliuren: DaLiuRenResult
  xiaoliuren: XiaoLiuRenResult
  jinkoujue: JinKouJueResult
  liuyao: LiuYaoResult
  meihua: MeiHuaResult
  xiaochengtu: XiaoChengTuResult
  jinqianke: JinQianKeResult
  zhugeshenshu: ZhuGeShenShuResult
  kongmingshengua: KongMingShenGuaResult
  'xuankong-feixing': XuanKongFeiXingResult
  bazhai: BaZhaiResult
  'dianzi-luopan': DianZiLuoPanResult
  'liji-chi': LiJiChiResult
  'shanxiang-ditu': ShanXiangDiTuResult
  taiyi: TaiYiResult
  'qizheng-siyu': QiZhengSiYuResult
  'wuyun-liuqi': WuYunLiuQiResult
  qiming: QiMingResult
  'xingming-jiexi': XingMingJieXiResult
  'feigong-xiaoqimen': FeiGongXiaoQiMenResult
  'shoujihao-fenxi': ShouJiHaoFenXiResult
  wannianli: WanNianLiResult
  'kangxi-zidian': KangXiZiDianResult
  'hanzi-shaixuan': HanZiShaiXuanResult
}
