/** 工具分类 */
export type ToolCategory =
  | "bazi-ziwei"    // 八字紫微
  | "qimen"          // 奇门遁甲
  | "liuren"         // 六壬神课
  | "divination"     // 占卜
  | "fengshui"       // 风水
  | "xingming"       // 星命
  | "naming"         // 起名
  | "classics"       // 经典文学
  | "culture"        // 文化百科
  | "utility";       // 工具/字典

/** 工具注册条目 */
export interface ToolEntry {
  /** 工具唯一标识 */
  id: string;
  /** 工具名称 */
  name: string;
  /** 简短短语（首页卡片下方小字） */
  subtitle: string;
  /** 分类 */
  category: ToolCategory;
  /** 图标名称（前端图标映射 key） */
  icon: string;
  /** 路由路径 */
  route: string;
  /** 是否在首页展示 */
  visible: boolean;
  /** 排序权重（越小越前） */
  sortOrder: number;
  /** 输入schema（JSON Schema格式，前端动态表单用） */
  inputSchema: Record<string, unknown>;
  /** 是否需要登录才能保存 */
  requireAuth: boolean;
  /** 状态 */
  status: "active" | "beta" | "coming_soon";
  /** 工具描述 */
  description: string;
  /** 关联工具切换（如金口诀→阴盘奇门/奇门穿壬） */
  crossTools?: string[];
}

/** 首页工具目录响应 */
export interface ToolsDirectory {
  /** 按分类分组的工具列表 */
  groups: ToolCategoryGroup[];
  /** 全部工具数量 */
  total: number;
}

export interface ToolCategoryGroup {
  category: ToolCategory;
  /** 分类中文名 */
  label: string;
  /** 分类图标 */
  icon: string;
  /** 该分类下的工具 */
  tools: ToolEntry[];
}

/** 工具嵌入模式 */
export type EmbedMode = "full" | "card" | "minimal" | "live";

/** 工具嵌入请求参数 */
export interface ToolEmbedParams {
  toolId: string;
  mode: EmbedMode;
  /** 预设输入参数（如从圈子帖子跳转时带生辰） */
  preset?: Record<string, unknown>;
  /** 来源场景 */
  sourceScene: "home" | "circle_post" | "livestream" | "article" | "im" | "course" | "qa" | "comment";
  /** 来源ID（帖子/直播/文章ID等） */
  sourceId?: string;
}
