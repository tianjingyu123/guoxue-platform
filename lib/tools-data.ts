// 排盘工具数据
export interface Tool {
  id: string
  name: string
  iconId: string
  href: string
  badge?: boolean
}

// 智能体数据
export interface Agent {
  id: string
  name: string
  description: string
  avatar: string
  href: string
}

// 排盘工具列表 - 前32个默认展示，其余展开显示
export const tools: Tool[] = [
  // 第一行 - 已开发
  { id: "bazi", name: "八字排盘", iconId: "bazi", href: "/paipan/bazi" },
  { id: "bazi-analysis", name: "八字解析", iconId: "bazi-analysis", href: "/paipan/tools/coming-soon?name=八字解析", badge: true },
  { id: "qimen", name: "奇门遁甲", iconId: "qimen", href: "/paipan/qimen" },
  { id: "yinqimen", name: "阴盘奇门", iconId: "yinqimen", href: "/paipan/tools/coming-soon?name=阴盘奇门" },
  // 第二行
  { id: "liuyao", name: "六爻排盘", iconId: "liuyao", href: "/paipan/tools/coming-soon?name=六爻排盘" },
  { id: "meihua", name: "梅花易数", iconId: "meihua", href: "/paipan/tools/coming-soon?name=梅花易数" },
  { id: "yangming", name: "阳盘命理", iconId: "yangming", href: "/paipan/yangpan" },
  { id: "mingli-qimen", name: "命理奇门", iconId: "mingli-qimen", href: "/paipan/tools/coming-soon?name=命理奇门" },
  // 第三行
  { id: "ziwei", name: "紫微斗数", iconId: "ziwei", href: "/paipan/tools/coming-soon?name=紫微斗数" },
  { id: "daliuren", name: "大六壬", iconId: "daliuren", href: "/paipan/tools/coming-soon?name=大六壬" },
  { id: "xiaoliuren", name: "小六壬", iconId: "xiaoliuren", href: "/paipan/tools/coming-soon?name=小六壬" },
  { id: "jinkoujue", name: "金口诀", iconId: "jinkoujue", href: "/paipan/tools/coming-soon?name=金口诀" },
  // 第四行
  { id: "naming", name: "起名工具", iconId: "naming", href: "/paipan/tools/coming-soon?name=起名工具", badge: true },
  { id: "name-analysis", name: "姓名解析", iconId: "name-analysis", href: "/paipan/tools/coming-soon?name=姓名解析", badge: true },
  { id: "phone-analysis", name: "手机号分析", iconId: "phone-analysis", href: "/paipan/tools/coming-soon?name=手机号分析" },
  { id: "zhuge", name: "诸葛神数", iconId: "zhuge", href: "/paipan/tools/coming-soon?name=诸葛神数" },
  // 第五行
  { id: "compass", name: "电子罗盘", iconId: "compass", href: "/paipan/tools/coming-soon?name=电子罗盘" },
  { id: "ruler", name: "立极尺", iconId: "ruler", href: "/paipan/tools/coming-soon?name=立极尺" },
  { id: "direction-map", name: "山向地图", iconId: "direction-map", href: "/paipan/tools/coming-soon?name=山向地图" },
  { id: "flying-star", name: "玄空飞星", iconId: "flying-star", href: "/paipan/tools/coming-soon?name=玄空飞星" },
  // 第六行
  { id: "kongming", name: "孔明神卦", iconId: "kongming", href: "/paipan/tools/coming-soon?name=孔明神卦" },
  { id: "bazhai", name: "八宅排盘", iconId: "bazhai", href: "/paipan/tools/coming-soon?name=八宅排盘" },
  { id: "feigong", name: "飞宫小奇门", iconId: "feigong", href: "/paipan/tools/coming-soon?name=飞宫小奇门" },
  { id: "taiyi", name: "太乙神数", iconId: "taiyi", href: "/paipan/tools/coming-soon?name=太乙神数" },
  // 第七行
  { id: "xiaocheng", name: "小成图", iconId: "xiaocheng", href: "/paipan/tools/coming-soon?name=小成图" },
  { id: "calendar", name: "万年历", iconId: "calendar", href: "/paipan/tools/coming-soon?name=万年历" },
  { id: "jinqianke", name: "金钱课", iconId: "jinqianke", href: "/paipan/tools/coming-soon?name=金钱课" },
  { id: "qimen-chuanren", name: "奇门穿壬", iconId: "qimen-chuanren", href: "/paipan/tools/coming-soon?name=奇门穿壬" },
  // 第八行
  { id: "shanxiang-qimen", name: "山向奇门", iconId: "shanxiang-qimen", href: "/paipan/tools/coming-soon?name=山向奇门" },
  { id: "solar-terms", name: "节气查询", iconId: "solar-terms", href: "/paipan/tools/coming-soon?name=节气查询" },
  { id: "dictionary", name: "字典查询", iconId: "dictionary", href: "/paipan/tools/coming-soon?name=字典查询" },
  { id: "char-filter", name: "汉字筛选", iconId: "char-filter", href: "/paipan/tools/coming-soon?name=汉字筛选" },
  // 展开后显示
  { id: "partner", name: "合伙人", iconId: "partner", href: "/paipan/tools/coming-soon?name=合伙人" },
  { id: "mini-program", name: "小程序开发", iconId: "mini-program", href: "/paipan/tools/coming-soon?name=小程序开发" },
  { id: "vip-service", name: "会员服务", iconId: "vip-service", href: "/paipan/tools/coming-soon?name=会员服务" },
  { id: "customer-service", name: "在线客服", iconId: "customer-service", href: "/paipan/tools/coming-soon?name=在线客服" },
]

// 中医工具数据
export interface MedicalTool {
  id: string
  name: string
  iconId: string
  href: string
  badge?: boolean
}

// 中医工具列表
export const medicalTools: MedicalTool[] = [
  // 第一行
  { id: "tongue", name: "舌诊分析", iconId: "tongue", href: "/tools/coming-soon?name=舌诊分析" },
  { id: "face", name: "面诊分析", iconId: "face", href: "/tools/coming-soon?name=面诊分析" },
  { id: "pulse", name: "脉象查询", iconId: "pulse", href: "/tools/coming-soon?name=脉象查询" },
  { id: "constitution", name: "体质辨识", iconId: "constitution", href: "/tools/coming-soon?name=体质辨识" },
  // 第二行
  { id: "acupoint", name: "穴位查询", iconId: "acupoint", href: "/tools/coming-soon?name=穴位查询" },
  { id: "meridian", name: "经络图解", iconId: "meridian", href: "/tools/coming-soon?name=经络图解" },
  { id: "herb", name: "中药查询", iconId: "herb", href: "/tools/coming-soon?name=中药查询" },
  { id: "prescription", name: "方剂大全", iconId: "prescription", href: "/tools/coming-soon?name=方剂大全" },
  // 第三行
  { id: "syndrome", name: "证候分析", iconId: "syndrome", href: "/tools/coming-soon?name=证候分析" },
  { id: "health-calendar", name: "养生日历", iconId: "health-calendar", href: "/tools/coming-soon?name=养生日历" },
  { id: "five-elements", name: "五行体质", iconId: "five-elements", href: "/tools/coming-soon?name=五行体质" },
  { id: "food-therapy", name: "食疗方案", iconId: "food-therapy", href: "/tools/coming-soon?name=食疗方案" },
  // 第四行
  { id: "wuyun", name: "五运六气", iconId: "wuyun", href: "/tools/coming-soon?name=五运六气", badge: true },
  { id: "ziwu", name: "子午流注", iconId: "ziwu", href: "/tools/coming-soon?name=子午流注" },
  { id: "lingguibafa", name: "灵龟八法", iconId: "lingguibafa", href: "/tools/coming-soon?name=灵龟八法" },
  { id: "health-ai", name: "健康顾问", iconId: "health-ai", href: "/tools/coming-soon?name=健康顾问", badge: true },
]

// 智能体列表
export const agents: Agent[] = [
  {
    id: "master-trainer",
    name: "大师陪练官",
    description: "一对一命理解盘陪练",
    avatar: "master",
    href: "/tools/coming-soon?name=大师陪练官"
  },
  {
    id: "classic-expert",
    name: "古籍经典专家",
    description: "周易古籍深度解读",
    avatar: "classic",
    href: "/tools/coming-soon?name=古籍经典专家"
  },
  {
    id: "report-generator",
    name: "命理报告师",
    description: "专业命理报告生成",
    avatar: "report",
    href: "/tools/coming-soon?name=命理报告师"
  },
  {
    id: "study-assistant",
    name: "易学学习助手",
    description: "入门到进阶学习指导",
    avatar: "study",
    href: "/tools/coming-soon?name=易学学习助手"
  },
  {
    id: "qimen-advisor",
    name: "奇门决策顾问",
    description: "奇门遁甲实战分析",
    avatar: "qimen",
    href: "/tools/coming-soon?name=奇门决策顾问"
  },
  {
    id: "ziwei-reader",
    name: "紫微解盘师",
    description: "紫微斗数命盘解读",
    avatar: "ziwei",
    href: "/tools/coming-soon?name=紫微解盘师"
  },
  {
    id: "fengshui-master",
    name: "风水布局师",
    description: "居家风水分析指导",
    avatar: "fengshui",
    href: "/tools/coming-soon?name=风水布局师"
  },
  {
    id: "naming-expert",
    name: "起名大师",
    description: "姓名学专业取名",
    avatar: "naming",
    href: "/tools/coming-soon?name=起名大师"
  },
]
