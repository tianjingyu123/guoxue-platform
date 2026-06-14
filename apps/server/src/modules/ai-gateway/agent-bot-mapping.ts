/**
 * Agent-Bot 映射表
 *
 * 映射 agentId → Coze Bot ID，用于后端 SSE 代理转发
 * 更新此表后无需重启服务（可通过 Redis 动态覆盖）
 */

export interface AgentConfig {
  agentId: string;
  botId: string;
  name: string;
  description: string;
  icon: string;
  category: "命运预测" | "占卜断事" | "婚恋情感" | "生活择吉";
  /** Coze API 版本 */
  apiVersion: "v3";
}

export const AGENT_BOT_MAP: Record<string, AgentConfig> = {
  "bazi-master": {
    agentId: "bazi-master",
    botId: "7649355557388255282",
    name: "八字命理精批师",
    description: "精通传统八字命理学，六维系统分析格局/用神/大运/六亲/专项，引经据典深入浅出",
    icon: "bazi",
    category: "命运预测",
    apiVersion: "v3",
  },
  "ziwei-master": {
    agentId: "ziwei-master",
    botId: "7649356204363431978",
    name: "紫微斗数分析师",
    description: "三合派兼通飞星四化，十二宫/四化/格局深度解析",
    icon: "ziwei",
    category: "命运预测",
    apiVersion: "v3",
  },
  "hehun-advisor": {
    agentId: "hehun-advisor",
    botId: "7649356570660634633",
    name: "合婚匹配顾问",
    description: "四维交叉合婚分析：八字+紫微+生肖+面相，综合匹配度评分",
    icon: "hehun",
    category: "婚恋情感",
    apiVersion: "v3",
  },
  "liuyao-diviner": {
    agentId: "liuyao-diviner",
    botId: "7649355950532886570",
    name: "六爻占卜师",
    description: "六爻纳甲法断事解惑，六层递进：卦象→纳甲→用神→动爻→月建→应期",
    icon: "liuyao",
    category: "占卜断事",
    apiVersion: "v3",
  },
  "zeri-master": {
    agentId: "zeri-master",
    botId: "7649356132011933702",
    name: "择日通书师",
    description: "七法综合择吉：黄历/建除/二十八宿/董公/乌兔太阳/神煞/奇门，加权评分",
    icon: "zeri",
    category: "生活择吉",
    apiVersion: "v3",
  },
};

/** Agent 列表（供前端展示） */
export const AGENT_LIST = Object.values(AGENT_BOT_MAP);

/** 风险免责声明 — 所有 Agent 响应末尾自动追加 */
export const RISK_DISCLAIMER =
  "\n\n---\n\n⚠️ **风险提示**：以上内容由AI生成，仅供传统文化学习与参考，不构成任何决策建议。请理性看待，切勿迷信。";
