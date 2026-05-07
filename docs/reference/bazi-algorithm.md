# 八字排盘算法参考

> 来源：红星系统 `baziPan` 页面内嵌JS逆向提取
> 日期：2026-05-07

## 一、基础数组

```typescript
/** 十天干 */
const GAN = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸']

/** 十二地支 */
const ZHI = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥']

/** 地支藏干（主气） */
const ZHI_GAN = ['癸','己','甲','乙','戊','丙','丁','己','庚','辛','戊','壬']

/** 五虎遁（月干计算，甲年起丙寅月，依次类推） */
const WU_HU_DUN = ['丙','戊','庚','壬','甲','丙','戊','庚','壬','甲']
// 甲己年→丙寅, 乙庚年→戊寅, 丙辛年→庚寅, 丁壬年→壬寅, 戊癸年→甲寅

/** 五鼠遁（时干计算，甲日起甲子时，依次类推） */
const WU_SHU_DUN = ['甲','丙','戊','庚','壬','甲','丙','戊','庚','壬']
// 甲己日→甲子, 乙庚日→丙子, 丙辛日→戊子, 丁壬日→庚子, 戊癸日→壬子

/** 月建 */
const YUE_JIAN = ['寅','卯','辰','巳','午','未','申','酉','戌','亥','子','丑']

/** 生肖 */
const ANIMAL = ['鼠','牛','虎','兔','龙','蛇','马','羊','猴','鸡','狗','猪']
```

## 二、十神映射

```typescript
// 阴干日元的十神顺序
const SHI_SHENG_YIN = ['比','伤','食','财','才','官','杀','印','枭','劫']
// 阳干日元的十神顺序
const SHI_SHENG_YANG = ['比','劫','食','伤','才','财','杀','官','枭','印']

/**
 * 十神计算逻辑：
 * 1. 日干位置 riGanPos
 * 2. 目标天干位置 targetPos
 * 3. 偏移量 = targetPos - riGanPos (或 +10)
 * 4. 根据日干阴阳取对应数组[偏移量]
 */
```

## 三、纳音表 (60甲子纳音)

```
甲子乙丑 → 海中金    丙寅丁卯 → 炉中火    戊辰己巳 → 大林木
庚午辛未 → 路旁土    壬申癸酉 → 剑锋金    甲戌乙亥 → 山头火
丙子丁丑 → 涧下水    戊寅己卯 → 城头土    庚辰辛巳 → 白蜡金
壬午癸未 → 杨柳木    甲申乙酉 → 井泉水    丙戌丁亥 → 屋上土
戊子己丑 → 霹雳火    庚寅辛卯 → 松柏木    壬辰癸巳 → 长流水
甲午乙未 → 沙中金    丙申丁酉 → 山下火    戊戌己亥 → 平地木
庚子辛丑 → 壁上土    壬寅癸卯 → 金箔金    甲辰乙巳 → 覆灯火
丙午丁未 → 天河水    戊申己酉 → 大驿土    庚戌辛亥 → 钗钏金
壬子癸丑 → 桑柘木    甲寅乙卯 → 大溪水    丙辰丁巳 → 沙中土
戊午己未 → 天上火    庚申辛酉 → 石榴木    壬戌癸亥 → 大海水
```

## 四、十二长生地势

```
天干 → 长生位置
甲 → 亥, 乙 → 午, 丙 → 寅, 丁 → 酉, 戊 → 寅
己 → 酉, 庚 → 巳, 辛 → 子, 壬 → 申, 癸 → 卯

顺序: 长生→沐浴→冠带→临官→帝旺→衰→病→死→墓→绝→胎→养
```

## 五、年干支计算

```typescript
const JIAZI_YEAR = 1984 // 甲子年

function yearToGanZhi(year: number): string {
  const absYears = Math.abs(year - JIAZI_YEAR)
  let ganPos: number, zhiPos: number
  
  if (year >= JIAZI_YEAR) {
    ganPos = absYears % 10
    zhiPos = absYears % 12
  } else {
    ganPos = (10 - absYears % 10) % 10
    zhiPos = (12 - absYears % 12) % 12
  }
  
  return GAN[ganPos] + ZHI[zhiPos]
}
```

## 六、日干支计算

```typescript
const JIAZI_DATE = new Date('1984-01-01T00:00:00+08:00')
const JIAZI_EPOCH = Math.floor(JIAZI_DATE.getTime() / 1000) // 449510400

function dateToGanZhi(date: Date): string {
  const daysDiff = Math.floor((date.getTime()/1000 - JIAZI_EPOCH) / 86400)
  const ganPos = ((daysDiff % 10) + 10) % 10
  const zhiPos = ((daysDiff % 12) + 12) % 12
  return GAN[ganPos] + ZHI[zhiPos]
}
```

## 七、时柱计算（五鼠遁）

```typescript
function hourToGanZhi(riGan: string, hour: number): string {
  // 时支：23-1子,1-3丑,...,按2小时一段
  const zhiIndex = Math.floor((hour + 1) % 24 / 2)
  
  // 五鼠遁：日干 → 子时天干
  const riGanIndex = GAN.indexOf(riGan)
  const wuShuIndex = Math.floor(riGanIndex % 5) // 甲己→0, 乙庚→1, ...
  const ganIndex = (GAN.indexOf(WU_SHU_DUN[wuShuIndex]) + zhiIndex) % 10
  
  return GAN[ganIndex] + ZHI[zhiIndex]
}
```

## 八、月柱计算（五虎遁 + 节气）

```typescript
function monthToGanZhi(nianGan: string, yueIndex: number): string {
  // 五虎遁：年干 → 寅月天干
  const nianGanIndex = GAN.indexOf(nianGan)
  const wuHuIndex = Math.floor(nianGanIndex % 5)
  const ganIndex = (GAN.indexOf(WU_HU_DUN[wuHuIndex]) + yueIndex) % 10
  
  return GAN[ganIndex] + ZHI[yueIndex]
}
```

## 九、大运计算

```
1. 年柱天干 → 阳年(甲丙戊庚壬) / 阴年(乙丁己辛癸)
2. 性别 → 男/女
3. 阳男阴女顺排，阴男阳女逆排
4. 起运岁数 = 距最近节气天数 / 3 (3天折1岁)
5. 从月柱顺/逆排8步大运
```

## 十、合冲刑害检测

```typescript
// 天干五合
const GAN_HE = { '甲己': true, '乙庚': true, '丙辛': true, '丁壬': true, '戊癸': true }

// 地支六合
const ZHI_HE = { '子丑': true, '寅亥': true, '卯戌': true, '辰酉': true, '巳申': true, '午未': true }

// 地支三合局
const SAN_HE = { '申子辰': '水', '亥卯未': '木', '寅午戌': '火', '巳酉丑': '金' }

// 地支三会局
const SAN_HUI = { '亥子丑': '水', '寅卯辰': '木', '巳午未': '火', '申酉戌': '金' }

// 六冲
const CHONG = { '子午': true, '丑未': true, '寅申': true, '卯酉': true, '辰戌': true, '巳亥': true }

// 六害
const HAI = { '寅巳': true, '卯辰': true, '午丑': true, '子未': true, '申亥': true, '酉戌': true }

// 三刑
const SAN_XING = { '寅巳申': true, '丑戌未': true }

// 自刑: 辰/午/酉/亥
```

## 十一、颜色体系

```typescript
const GAN_COLOR: Record<string, string> = {
  '甲': '#43ab18', '乙': '#43ab18', // 绿
  '丙': '#e40b06', '丁': '#e40b06', // 红
  '戊': '#964607', '己': '#964607', // 棕
  '庚': '#f4a600', '辛': '#f4a600', // 橙
  '壬': '#006aff', '癸': '#006aff', // 蓝
}

const ZHI_COLOR: Record<string, string> = {
  '子': '#006aff', '丑': '#964607',   // 蓝/棕
  '寅': '#43ab18', '卯': '#43ab18',   // 绿
  '辰': '#964607', '巳': '#e40b06',   // 棕/红
  '午': '#e40b06', '未': '#964607',   // 红/棕
  '申': '#f4a600', '酉': '#f4a600',   // 橙
  '戌': '#964607', '亥': '#006aff',   // 棕/蓝
}
```

## 十二、节气数据需求

需要包含1600-2100年各节气的Unix时间戳。数据结构：
```typescript
// JieQi[year][month] = timestamp
// month: 0=立春, 1=惊蛰, ..., 11=小寒
const JieQi: number[][] = [
  // [year-1600][12月份节气时间戳]
]
```
