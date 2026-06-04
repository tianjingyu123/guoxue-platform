# 排盘工具 — 组件目录

> 排盘工具所有 UI 元素必须从本目录选取。
> 三级组件体系：原子（shadcn/ui）→ 业务（自行封装）→ 模板（自行封装）。
> Claude 只能"选用"组件，不能"发明"组件。新组件必须先登记。

---

## 第零层：组件注册规则

新增业务组件或模板组件时，必须：
1. 在此文件中登记（名称 + 用途 + Props 签名 + 截图位置）
2. 通过 DESIGN_CONSTRAINTS.md 视觉自查
3. 使用 COLOR_TOKENS.ts 中定义的颜色
4. 组件不超过 200 行（超过则拆分）

---

## 第一层：原子组件（来自 shadcn/ui + Element Plus）

这些是底层积木，不在此文件中列出完整清单。
Claude 直接从 shadcn/ui 和 Element Plus 文档查找。

**使用规则：**
- 优先 shadcn/ui（Button/Input/Select/Dialog/DropdownMenu/Tabs/Tooltip 等）
- Element Plus 仅用于复杂组件（Table/DatePicker/TimePicker/Cascader）
- 不混用：同一个交互区域只用一套组件体系

---

## 第二层：业务组件

以下为排盘工具封装的业务组件。所有组件 Props 在此定义，
Claude 和 V0 均以此为准。

---

### ChartInput 排盘输入组件

```typescript
// 根据 input-schema API 返回的 JSON Schema 动态渲染表单
interface ChartInputProps {
  toolId: string                    // 工具ID
  schema: InputSchema               // 从 GET /tools/:id/input-schema 获取
  initialValues?: Record<string, any>
  onSubmit: (values: Record<string, any>) => void
  loading?: boolean
}

// InputSchema 类型（来自 API）
interface InputSchema {
  type: 'object'
  properties: Record<string, {
    type: 'string' | 'number' | 'enum' | 'datetime' | 'boolean' | 'array'
    label: string
    required?: boolean
    values?: string[]       // enum 类型时
    min?: number            // number 类型时
    max?: number
    default?: any
  }>
  required: string[]
}
```

**渲染规则：**
- `string` → Input（文本输入框）
- `number` → InputNumber（数字输入框）
- `enum` → Select（下拉选择）
- `datetime` → DatePicker + TimePicker 组合
- `boolean` → Switch（开关）
- `array` → Checkbox 组
- 覆盖默认值：`initialValues` 优先级高于 schema 的 `default`

---

### SiZhuDisplay 四柱展示

```typescript
interface SiZhuDisplayProps {
  siZhu: SiZhu          // { nian, yue, ri, shi } 每个含 gan/zhi
  showShiShen?: boolean  // 是否显示十神标注
  showShenSha?: boolean  // 是否显示神煞标注
  className?: string
}

interface SiZhu {
  nian: ZhuInfo
  yue: ZhuInfo
  ri: ZhuInfo
  shi: ZhuInfo
}

interface ZhuInfo {
  gan: string        // 天干
  zhi: string        // 地支
  cangGan?: string[] // 藏干
  shiShen?: string   // 十神（相对日干）
  shenSha?: string[] // 该柱相关神煞
}
```

**展示规则：**
- 四列等宽排列（年/月/日/时）
- 天干在上、地支在下（上下结构，不是左右）
- 天干/地支颜色按 `TIANGAN` / `DIZHI` 令牌
- 十神标注在地支下方，小字号 `text-xs`
- 神煞以 Tag 形式放在最底部
- 日柱加边框高亮（标识"日元"）

---

### DaYunTimeline 大运时间轴

```typescript
interface DaYunTimelineProps {
  startAge: number        // 起运年龄
  daYun: DaYunStep[]      // 大运步骤
  currentAge?: number     // 当前年龄（高亮当前运）
  yearPillar?: number     // 年柱索引（用于顺逆排标识）
}

interface DaYunStep {
  ganZhi: string          // 大运干支
  ageRange: [number, number]  // [起, 止]
  years: number[]         // 起运对应公历年份
  liuNian?: LiuNian[]     // 该大运内的流年（可选展开）
}
```

**展示规则：**
- 横向时间轴（桌面端）/ 纵向列表（移动端）
- 当前所在大运高亮（`UI.brandLight` 背景）
- 每步大运显示十年跨度 + 干支
- 干支颜色按五行令牌
- 可选"展开流年"按钮

---

### ShenShaList 神煞列表

```typescript
interface ShenShaListProps {
  shenSha: ShenShaItem[]   // 所有神煞
  mode: 'full' | 'compact' // 完整/紧凑模式
  maxVisible?: number      // compact 模式下最多显示数量，超出折叠
}

interface ShenShaItem {
  name: string             // 神煞名称
  type: 'ji' | 'xiong' | 'ping'
  pillar: 'nian' | 'yue' | 'ri' | 'shi'  // 所在柱
  source?: string          // 古籍出处（可选）
}
```

**展示规则：**
- 以 Tag 形式展示，颜色按 `JIXIONG` 令牌
- 吉神用绿色、凶神用红色、平用灰色
- compact 模式：显示前 N 个 + "...+X" 折叠按钮
- 点击 Tag 可查看古籍出处（弹出 Tooltip）

---

### QimenGongGrid 奇门九宫格

```typescript
interface QimenGongGridProps {
  gongs: QimenGong[]       // 9 个宫位（坎1..离9）
  juNumber: number         // 局数
  dunType: 'yang' | 'yin' // 阳遁/阴遁
  gongWidth?: number       // 宫格大小（默认 120px）
  showDetail?: boolean     // 是否显示宫内详细信息
}

interface QimenGong {
  id: number               // 宫位编号 1-9
  name: string             // 坎/坤/震/巽/乾/兑/艮/离 + 中
  diPan: string            // 地盘天干
  tianPan: string          // 天盘天干
  star: string             // 九星
  men: string              // 八门
  shen: string             // 八神
  isRuMu?: boolean         // 入墓标记
  isJiXing?: boolean       // 击刑标记
  isMenPo?: boolean        // 门破标记
  isKongWang?: boolean     // 空亡标记
  maStar?: boolean         // 马星标记
  changSheng?: string      // 长生状态
}
```

**展示规则：**
- 戴九履一、左三右七、二四为肩、六八为足 的标准布局
- 中五宫寄坤二或艮八（根据参数）
- 每宫显示：星/门/神/天地盘
- 星用 `QIMEN.starColor`、门用 `QIMEN.menColor`、神用 `QIMEN.shenColor`
- 入墓/击刑/门破 在宫位角标注符号（非 emoji，用 SVG 小图标）
- 空亡宫底色为 `QIMEN.emptyGong`
- 马星宫位角标 `QIMEN.maStar` 色小三角

---

### GuaDisplay 卦象展示

```typescript
interface GuaDisplayProps {
  benGua: GuaInfo       // 本卦
  bianGua?: GuaInfo     // 变卦（可选）
  huGua?: GuaInfo       // 互卦（可选，梅花用）
  yaoEntries?: YaoEntry[] // 六爻纳甲（六爻用）
  showTiyong?: boolean  // 是否显示体用生克（梅花用）
}

interface GuaInfo {
  name: string          // 卦名
  symbol: string        // 卦符（䷀ 等 Unicode 六十四卦符号）
  yao: number[]         // 六爻（1=阳 0=阴，从下到上）
  upperGua: string      // 上卦（三爻）
  lowerGua: string      // 下卦（三爻）
  wuxing: string        // 五行属性
}

interface YaoEntry {
  position: 1 | 2 | 3 | 4 | 5 | 6
  yaoType: 0 | 1        // 阴/阳
  ganZhi: string        // 纳甲干支
  liuQin: string        // 六亲
  liuShou: string       // 六兽
  shiYing?: 'shi' | 'ying' // 世应
  isDong?: boolean      // 是否动爻
}
```

**展示规则：**
- 卦爻从下往上排列（初爻在底部）
- 阴爻显示为 "⚋"（中间断开）、阳爻显示为 "⚊"（连续）
- 动爻用 `UI.brand` 标记（红色 ○/× 在爻旁）
- 世应标记："世" 在爻旁红色圆点、"应" 蓝色圆点
- 本卦/变卦/互卦三卦并排（等宽）

---

### CiteBlock 古籍引用块

```typescript
interface CiteBlockProps {
  source: CiteSource    // 古籍出处信息
  compact?: boolean     // 紧凑模式（默认展开）
}

interface CiteSource {
  bookName: string      // 古籍名（如 "渊海子平"）
  volume?: string       // 卷（如 "卷三"）
  section?: string      // 篇/章
  originalText: string  // 原文引用
  annotations?: string[] // 其他注本引用
}
```

**展示规则：**
- 衬线字体（`font-serif`）
- 原文缩进显示
- 书名加粗
- 紧凑模式仅显示书名+卷，点击展开原文

---

### AnnotationPanel 批注面板

```typescript
interface AnnotationPanelProps {
  annotations: ChartAnnotation[]
  targetId: string           // 当前批注目标
  canEdit: boolean
  onAdd: (content: string) => void
  onEdit: (id: string, content: string) => void
  onDelete: (id: string) => void
}

interface ChartAnnotation {
  id: string
  content: string
  tags: string[]
  author: { nickname: string; avatar?: string }
  createdAt: string
  visibility: 'private' | 'station' | 'public'
}
```

**展示规则：**
- 列表形式，最新在上
- 每条批注：头像 + 昵称 + 时间 + 内容 + 标签
- 批注可点击目标对象定位（交互逻辑由父组件处理）
- 输入框 + 发送按钮（对标飞书评论组件交互）

---

### CompareView 对比视图

```typescript
interface CompareViewProps {
  left: React.ReactNode     // 方案 A 内容
  right: React.ReactNode    // 方案 B 内容
  leftLabel: string
  rightLabel: string
  diffs?: DiffItem[]        // 差异列表
}

interface DiffItem {
  label: string             // 差异项名称
  leftValue: string
  rightValue: string
  reason?: string           // 差异原因说明
}
```

**展示规则：**
- 左右等宽
- 差异列默认收起，展开后从右侧滑入
- 差异项高亮（背景淡黄）

---

### WuxingRadar 五行雷达图

```typescript
interface WuxingRadarProps {
  data: Record<string, number>  // { mu: 85, huo: 60, ... }
  size?: number                 // 图表尺寸
}
```

**展示规则：**
- ECharts 雷达图，使用 `CHART.wuxingRadar` 配色
- 五边形轴线，五个角标注五行名称
- 不需要图例

---

### ClientCard 客户卡片

```typescript
interface ClientCardProps {
  client: ClientInfo
  onClick?: () => void
}

interface ClientInfo {
  id: string
  nickname: string
  avatar?: string
  gender: '男' | '女'
  birthInfo: string       // "1984年3月15日 8时"
  lastChartDate?: string  // 最近排盘日期
  totalCharts: number     // 总排盘次数
  tags: string[]          // 标签
}
```

**展示规则：**
- 卡片：头像 + 姓名 + 性别 + 出生信息
- 底部：最近排盘日期 + 总次数
- 标签最多显示 3 个，超出 "+N"
- 可点击整卡跳转客户详情

---

## 第三层：模板组件

模板组件直接对应 TEMPLATE_MAP.md 中的五种模板。
每个模板是纯布局壳，通过 `children` 或 named slots 接收内容。

```typescript
// 所有模板组件的公共 Props
interface PageTemplateProps {
  children: React.ReactNode
  className?: string
}
```

| 组件名 | 文件 | 对应模板 |
|--------|------|----------|
| `PageTool` | 模板 A | 工具页 |
| `PageWorkspace` | 模板 B | 工作台页 |
| `PageCompare` | 模板 C | 对比页 |
| `PageDashboard` | 模板 D | 仪表盘页 |
| `PageList` | 模板 E | 列表管理页 |

**模板组件职责：**
- 提供布局结构（CSS Grid / Flex）
- 不包含业务逻辑
- 不包含排盘相关状态
- 所有内容通过 props/slots 注入

---

## 组件选用流程

```
1. 查本文件 → 确定需要哪些业务组件
2. 查 TEMPLATE_MAP.md → 确定用哪个模板
3. 用模板包业务组件 → 用业务组件包原子组件
4. 写 page 文件 → 组合模板 + 业务组件 + API 调用
```
