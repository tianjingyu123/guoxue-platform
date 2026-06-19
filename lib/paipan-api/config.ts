// 排盘API配置

// API基础路径
// 开发环境: Cloudflare Tunnel
// 生产环境: https://guoxue.ac.cn
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "https://unsigned-develop-descriptions-angels.trycloudflare.com"
export const API_VERSION = "/api/v1"

// 是否使用Mock数据（开发调试用）
export const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true"

// 完整API路径
export const getApiUrl = (path: string) => `${API_BASE_URL}${API_VERSION}${path}`

// API端点
export const API_ENDPOINTS = {
  // 计算排盘
  calculate: (toolId: string) => getApiUrl(`/tools/${toolId}/calculate`),
  // 获取Mock数据（开发用）
  mock: (toolId: string) => getApiUrl(`/tools/${toolId}/mock`),
  // 获取输入Schema
  inputSchema: (toolId: string) => getApiUrl(`/tools/${toolId}/input-schema`),
  // 工具目录
  directory: () => getApiUrl("/tools/directory"),
  // AI分析（需登录）
  analyze: (toolId: string) => getApiUrl(`/tools/${toolId}/analyze`),
}

// 工具ID映射（前端路由 -> API toolId）
export const TOOL_ID_MAP: Record<string, string> = {
  // 八字紫微
  "bazi": "bazi",
  "ziwei": "ziwei",
  // 奇门遁甲
  "qimen": "qimen-yang",
  "yangpan": "qimen-yang-mingli",
  "yinqimen": "qimen-yin",
  "yinqimen-mingli": "qimen-yin-mingli",
  "shanxiang-qimen": "shanxiang-qimen",
  "qimen-chuanren": "qimen-chuanren",
  // 占卜
  "liuyao": "liuyao",
  "meihua": "meihua",
  "xiaochengtu": "xiaochengtu",
  "jinqianke": "jinqianke",
  "zhugeshenshu": "zhugeshenshu",
  "kongmingshengua": "kongmingshengua",
  // 六壬神课
  "daliuren": "daliuren",
  "xiaoliuren": "xiaoliuren",
  "jinkoujue": "jinkoujue",
  // 风水
  "xuankong-feixing": "xuankong-feixing",
  "bazhai": "bazhai",
  "dianzi-luopan": "dianzi-luopan",
  "liji-chi": "liji-chi",
  "shanxiang-ditu": "shanxiang-ditu",
  // 星命
  "taiyi": "taiyi",
  "qizheng-siyu": "qizheng-siyu",
  "wuyun-liuqi": "wuyun-liuqi",
  // 起名
  "qiming": "qiming",
  "xingming-jiexi": "xingming-jiexi",
  // 工具字典
  "feigong-xiaoqimen": "feigong-xiaoqimen",
  "shoujihao-fenxi": "shoujihao-fenxi",
  "wannianli": "wannianli",
  "kangxi-zidian": "kangxi-zidian",
  "hanzi-shaixuan": "hanzi-shaixuan",
}
