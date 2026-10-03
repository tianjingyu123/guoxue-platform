export const liveTabs = ['全部', '知识授课', '电商带货', '关注的'] as const

export function formatLiveDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return hours > 0 ? `${hours}小时${minutes}分钟` : `${minutes}分钟`
}

export function formatLiveViews(count: number): string {
  return count >= 10000 ? `${(count / 10000).toFixed(1)}万` : String(count)
}
