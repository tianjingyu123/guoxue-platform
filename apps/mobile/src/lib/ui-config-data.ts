/**
 * 前端 UI 运营配置（P1 运营配置最小闭环）
 * 统一复用 GET /config/client 远程配置快照：后台改 ConfigSystem 对应键 → 前端展示随之变化。
 * 失败/未配置 → 用内置默认，绝不影响页面可用。
 */
import { getRemoteConfig, hydrateRemoteConfig } from '@/lib/remote-config'

export interface UiConfig {
  home: { bigCardInterval: number }
  agentCard: { categoryColors: Record<string, string> }
}

const DEFAULT_UI_CONFIG: UiConfig = {
  home: { bigCardInterval: 6 },
  agentCard: {
    categoryColors: { 文案生成: 'g-copy', 分析报告: 'g-analyze', 古籍查询: 'g-classic', 办公效率: 'g-office' },
  },
}

// 会话内缓存：一次拉取全局复用（配置低频变化）
let cached: UiConfig | null = null

export async function getUiConfig(force = false): Promise<UiConfig> {
  try {
    const data = (await hydrateRemoteConfig(force)).ui
    cached = {
      home: { bigCardInterval: Number(data?.home?.bigCardInterval) || DEFAULT_UI_CONFIG.home.bigCardInterval },
      agentCard: {
        categoryColors: data?.agentCard?.categoryColors && typeof data.agentCard.categoryColors === 'object'
          ? data.agentCard.categoryColors
          : DEFAULT_UI_CONFIG.agentCard.categoryColors,
      },
    }
    return cached
  } catch {
    return DEFAULT_UI_CONFIG
  }
}

/** 同步取已缓存配置（未拉取则返回默认）——供叶子组件同步读取 */
export function getCachedUiConfig(): UiConfig {
  if (cached) return cached
  const data = getRemoteConfig().ui
  return data || DEFAULT_UI_CONFIG
}
