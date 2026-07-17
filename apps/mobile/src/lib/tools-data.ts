/**
 * 排盘工具数据（从原型 lib/tools-data.ts 1:1 迁移）
 * href 保持原型路径风格，路由跳转时由 utils/router 统一处理（详见路由表）。
 * 未开发工具统一指向 coming-soon 占位页。
 */
import { defaultFavoriteToolIds } from '@/lib/paipan/tool-prefs'

export { defaultFavoriteToolIds }

export type ToolCategory = 'mingli' | 'bushi' | 'qimen' | 'fengshui' | 'xingming' | 'lifa' | 'service'

/** 工具分类元数据（推荐区色点/分组用，顺序即展示顺序） */
export const toolCategories: { key: ToolCategory; label: string }[] = [
  { key: 'mingli', label: '命理' },
  { key: 'bushi', label: '占卜' },
  { key: 'qimen', label: '奇门' },
  { key: 'fengshui', label: '风水' },
  { key: 'xingming', label: '姓名' },
  { key: 'lifa', label: '历法' },
  { key: 'service', label: '服务' },
]

export interface Tool { id: string; name: string; iconId: string; href: string; badge?: boolean; category?: ToolCategory; comingSoon?: boolean }
export interface MedicalTool { id: string; name: string; iconId: string; href: string; badge?: boolean; comingSoon?: boolean }
export interface Agent { id: string; name: string; description: string; avatar: string; href: string }

// 排盘工具 - 首页收起态显示 3 排（12 个），展开显示全部
export const tools: Tool[] = [
  // 命理推算
  { id: 'bazi', name: '八字排盘', iconId: 'bazi', href: '/paipan/bazi', category: 'mingli' },
  { id: 'bazi-analysis', name: '八字解析', iconId: 'bazi-analysis', href: '/paipan/tools/coming-soon?name=八字解析', category: 'mingli', comingSoon: true },
  { id: 'ziwei', name: '紫微斗数', iconId: 'ziwei', href: '/paipan/ziwei', badge: true, category: 'mingli' },
  { id: 'qizheng', name: '七政四余', iconId: 'qizheng', href: '/paipan/qizheng', badge: true, category: 'mingli' },
  { id: 'yangming', name: '阳盘命理', iconId: 'yangming', href: '/paipan/yangpan', category: 'mingli' },
  { id: 'hepan', name: '八字合盘', iconId: 'hepan', href: '/paipan/hepan', badge: true, category: 'mingli' },
  { id: 'mingli-qimen', name: '命理奇门', iconId: 'mingli-qimen', href: '/paipan/yinpan-mingli', badge: true, category: 'mingli' },
  { id: 'taiyi', name: '太乙神数', iconId: 'taiyi', href: '/paipan/taiyi', badge: true, category: 'mingli' },
  // 占卜起卦
  { id: 'liuyao', name: '六爻排盘', iconId: 'liuyao', href: '/paipan/liuyao', category: 'bushi' },
  { id: 'meihua', name: '梅花易数', iconId: 'meihua', href: '/paipan/meihua', badge: true, category: 'bushi' },
  { id: 'xiaoliuren', name: '小六壬', iconId: 'xiaoliuren', href: '/paipan/xiaoliuren', badge: true, category: 'bushi' },
  { id: 'daliuren', name: '大六壬', iconId: 'daliuren', href: '/paipan/daliuren', badge: true, category: 'bushi' },
  { id: 'jinkoujue', name: '金口诀', iconId: 'jinkoujue', href: '/paipan/jinkoujue', badge: true, category: 'bushi' },
  { id: 'kongming', name: '孔明神卦', iconId: 'kongming', href: '/paipan/kongming', badge: true, category: 'bushi' },
  { id: 'jinqianke', name: '金钱课', iconId: 'jinqianke', href: '/paipan/jinqianke', badge: true, category: 'bushi' },
  { id: 'xiaocheng', name: '小成图', iconId: 'xiaocheng', href: '/paipan/xiaochengtu', badge: true, category: 'bushi' },
  { id: 'zhuge', name: '诸葛神数', iconId: 'zhuge', href: '/paipan/zhuge', badge: true, category: 'bushi' },
  // 奇门遁甲
  { id: 'qimen', name: '奇门遁甲', iconId: 'qimen', href: '/paipan/qimen', category: 'qimen' },
  { id: 'yinqimen', name: '阴盘奇门', iconId: 'yinqimen', href: '/paipan/yinpan', badge: true, category: 'qimen' },
  { id: 'feigong', name: '飞宫小奇门', iconId: 'feigong', href: '/paipan/feigong', badge: true, category: 'qimen' },
  { id: 'qimen-chuanren', name: '奇门穿壬', iconId: 'qimen-chuanren', href: '/paipan/chuanren', badge: true, category: 'qimen' },
  { id: 'shanxiang-qimen', name: '山向奇门', iconId: 'shanxiang-qimen', href: '/paipan/shanxiang', badge: true, category: 'qimen' },
  // 风水堪舆
  { id: 'compass', name: '电子罗盘', iconId: 'compass', href: '/paipan/luopan', badge: true, category: 'fengshui' },
  { id: 'ruler', name: '立极尺', iconId: 'ruler', href: '/paipan/lijichi', badge: true, category: 'fengshui' },
  { id: 'flying-star', name: '玄空飞星', iconId: 'flying-star', href: '/paipan/xuankong', badge: true, category: 'fengshui' },
  { id: 'bazhai', name: '八宅排盘', iconId: 'bazhai', href: '/paipan/bazhai', badge: true, category: 'fengshui' },
  { id: 'direction-map', name: '山向地图', iconId: 'direction-map', href: '/paipan/tools/coming-soon?name=山向地图', category: 'fengshui', comingSoon: true },
  // 姓名数字
  { id: 'naming', name: '起名工具', iconId: 'naming', href: '/paipan/qiming', badge: true, category: 'xingming' },
  { id: 'name-analysis', name: '姓名解析', iconId: 'name-analysis', href: '/paipan/xingming', badge: true, category: 'xingming' },
  { id: 'phone-analysis', name: '数字能量解读', iconId: 'phone-analysis', href: '/paipan/shuzi', badge: true, category: 'xingming' },
  // 历法查询
  { id: 'calendar', name: '万年历', iconId: 'calendar', href: '/paipan/wannianli', badge: true, category: 'lifa' },
  { id: 'solar-terms', name: '节气查询', iconId: 'solar-terms', href: '/paipan/jieqi', category: 'lifa' },
  { id: 'dictionary', name: '字典查询', iconId: 'dictionary', href: '/paipan/zidian', category: 'lifa' },
  { id: 'char-filter', name: '汉字筛选', iconId: 'char-filter', href: '/paipan/tools/coming-soon?name=汉字筛选', category: 'lifa', comingSoon: true },
  // 更多服务
  { id: 'partner', name: '合伙人', iconId: 'partner', href: '/paipan/tools/coming-soon?name=合伙人', category: 'service', comingSoon: true },
  { id: 'mini-program', name: '小程序开发', iconId: 'mini-program', href: '/paipan/tools/coming-soon?name=小程序开发', category: 'service', comingSoon: true },
  { id: 'vip-service', name: '会员服务', iconId: 'vip-service', href: '/paipan/tools/coming-soon?name=会员服务', category: 'service', comingSoon: true },
  { id: 'customer-service', name: '在线客服', iconId: 'customer-service', href: '/paipan/tools/coming-soon?name=在线客服', category: 'service', comingSoon: true },
]

// 中医工具 - 前 8 个默认展示
export const medicalTools: MedicalTool[] = [
  { id: 'tongue', name: '舌诊分析', iconId: 'tongue', href: '/tools/coming-soon?name=舌诊分析', comingSoon: true },
  { id: 'face', name: '面诊分析', iconId: 'face', href: '/tools/coming-soon?name=面诊分析', comingSoon: true },
  { id: 'pulse', name: '脉象查询', iconId: 'pulse', href: '/tools/coming-soon?name=脉象查询', comingSoon: true },
  { id: 'constitution', name: '体质辨识', iconId: 'constitution', href: '/tools/coming-soon?name=体质辨识', comingSoon: true },
  { id: 'acupoint', name: '穴位查询', iconId: 'acupoint', href: '/tools/coming-soon?name=穴位查询', comingSoon: true },
  { id: 'meridian', name: '经络图解', iconId: 'meridian', href: '/tools/coming-soon?name=经络图解', comingSoon: true },
  { id: 'herb', name: '中药查询', iconId: 'herb', href: '/tools/coming-soon?name=中药查询', comingSoon: true },
  { id: 'prescription', name: '方剂大全', iconId: 'prescription', href: '/tools/coming-soon?name=方剂大全', comingSoon: true },
  { id: 'syndrome', name: '证候分析', iconId: 'syndrome', href: '/tools/coming-soon?name=证候分析', comingSoon: true },
  { id: 'health-calendar', name: '养生日历', iconId: 'health-calendar', href: '/tools/coming-soon?name=养生日历', comingSoon: true },
  { id: 'five-elements', name: '五行体质', iconId: 'five-elements', href: '/tools/coming-soon?name=五行体质', comingSoon: true },
  { id: 'food-therapy', name: '食疗方案', iconId: 'food-therapy', href: '/tools/coming-soon?name=食疗方案', comingSoon: true },
  { id: 'wuyun', name: '五运六气', iconId: 'wuyun', href: '/paipan/wuyunliuqi', badge: true },
  { id: 'ziwu', name: '子午流注', iconId: 'ziwu', href: '/tools/coming-soon?name=子午流注', comingSoon: true },
  { id: 'lingguibafa', name: '灵龟八法', iconId: 'lingguibafa', href: '/tools/coming-soon?name=灵龟八法', comingSoon: true },
  { id: 'health-ai', name: '健康顾问', iconId: 'health-ai', href: '/tools/coming-soon?name=健康顾问', comingSoon: true },
]

// AI 智能体
// 2026-07-17：8 张卡原 href 全指 coming-soon 占位——而旁边「查看全部」进的就是真广场（/agents），
// 同屏一半死一半活。卡片是原型时代的臆想角色（无真实 bot id，无法直达对话），统一改指真广场，
// 用户点卡进广场自选智能体开聊。后端上了对位 bot 后可再改成 /bots/chat?id= 直达。
export const agents: Agent[] = [
  { id: 'master-trainer', name: '大师陪练官', description: '一对一命理解盘陪练', avatar: 'master', href: '/agents' },
  { id: 'classic-expert', name: '古籍经典专家', description: '周易古籍深度解读', avatar: 'classic', href: '/agents' },
  { id: 'report-generator', name: '命理报告师', description: '专业命理报告生成', avatar: 'report', href: '/agents' },
  { id: 'study-assistant', name: '易学学习助手', description: '入门到进阶学习指导', avatar: 'study', href: '/agents' },
  { id: 'qimen-advisor', name: '奇门决策顾问', description: '奇门遁甲实战分析', avatar: 'qimen', href: '/agents' },
  { id: 'ziwei-reader', name: '紫微解盘师', description: '紫微斗数命盘解读', avatar: 'ziwei', href: '/agents' },
  { id: 'fengshui-master', name: '风水布局师', description: '居家风水分析指导', avatar: 'fengshui', href: '/agents' },
  { id: 'naming-expert', name: '起名大师', description: '姓名学专业取名', avatar: 'naming', href: '/agents' },
]

// 智能体头像渐变（与原型 AgentAvatar colors 1:1，含角色专属色）
export const AGENT_AVATAR_GRADIENT: Record<string, [string, string]> = {
  master: ['#f59e0b', '#ea580c'],   // amber-500 -> orange-600
  classic: ['#10b981', '#0d9488'],  // emerald-500 -> teal-600
  report: ['#3b82f6', '#4f46e5'],   // blue-500 -> indigo-600
  study: ['#a855f7', '#7c3aed'],    // purple-500 -> violet-600
  qimen: ['#f43f5e', '#db2777'],    // rose-500 -> pink-600
  ziwei: ['#06b6d4', '#0284c7'],    // cyan-500 -> sky-600
  fengshui: ['#84cc16', '#16a34a'], // lime-500 -> green-600
  naming: ['#d946ef', '#9333ea'],   // fuchsia-500 -> purple-600
}

// ============ API 层 ============

export const toolsApi = {
  /** 获取排盘工具列表（工具清单即前端配置，本地即真源，无后端依赖） */
  async getTools(): Promise<Tool[]> {
    return tools
  },
}
