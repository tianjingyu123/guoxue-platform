/**
 * 移动端通用工具函数
 */

/** 格式化时间：刚刚/x分钟前/x小时前/x天前/日期 */
export function formatTime(dateStr: string | Date): string {
  if (!dateStr) return ""
  const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr
  const now = Date.now()
  const diff = now - date.getTime()
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) return "刚刚"
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`
  if (days < 30) return `${Math.floor(days / 7)}周前`

  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  if (y === new Date().getFullYear()) return `${m}-${d}`
  return `${y}-${m}-${d}`
}

/** 格式化数字：1000→1k, 10000→1w */
export function formatCount(num: number): string {
  if (num >= 10000) return (num / 10000).toFixed(1).replace(/\.0$/, "") + "w"
  if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, "") + "k"
  return String(num)
}

/** 格式化时长（秒→ mm:ss 或 hh:mm:ss） */
export function formatDuration(seconds: number): string {
  if (!seconds || seconds < 0) return "00:00"
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  const mm = String(m).padStart(2, "0")
  const ss = String(s).padStart(2, "0")
  if (h > 0) return `${h}:${mm}:${ss}`
  return `${mm}:${ss}`
}

/** 课程类型标签映射 */
export function courseTypeLabel(type: string): string {
  const map: Record<string, string> = {
    VIDEO: "视频",
    AUDIO: "音频",
    TEXT: "文本",
    EBOOK: "电子书",
    COMBO: "组合",
  }
  return map[type] ?? type
}

/** 圈子类型标签 */
export function circleTypeLabel(type: string): string {
  const map: Record<string, string> = {
    FREE: "免费",
    PAID: "付费",
    YEARLY: "年费",
  }
  return map[type] ?? type
}

/** 内容类型标签 */
export function contentTypeLabel(type: string): string {
  const map: Record<string, string> = {
    ARTICLE: "文章",
    POEM: "诗词",
    CLASSIC: "经典",
  }
  return map[type] ?? type
}

/** 手机号脱敏 138****1234 */
export function maskPhone(phone: string): string {
  if (!phone || phone.length < 11) return phone ?? ""
  return phone.slice(0, 3) + "****" + phone.slice(-4)
}

/** 手机号验证 */
export function isValidPhone(phone: string): boolean {
  return /^1[3-9]\d{9}$/.test(phone)
}

/** 密码验证（6-20位） */
export function isValidPassword(password: string): boolean {
  return password.length >= 6 && password.length <= 20
}

/** 防抖 */
export function debounce<T extends (...args: any[]) => any>(fn: T, delay = 300): T {
  let timer: ReturnType<typeof setTimeout> | null = null
  return ((...args: any[]) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }) as unknown as T
}

/** 节流 */
export function throttle<T extends (...args: any[]) => any>(fn: T, delay = 300): T {
  let last = 0
  return ((...args: any[]) => {
    const now = Date.now()
    if (now - last >= delay) {
      last = now
      fn(...args)
    }
  }) as unknown as T
}

/** 获取默认头像 */
export function defaultAvatar(): string {
  return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='50' fill='%238b4513'/%3E%3Ctext x='50' y='65' text-anchor='middle' fill='white' font-size='40'%3E国%3C/text%3E%3C/svg%3E"
}

/** 获取默认封面占位图 */
export function defaultCover(): string {
  return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='200'%3E%3Crect fill='%23f5f0e6' width='400' height='200'/%3E%3Ctext x='200' y='100' text-anchor='middle' dy='.3em' fill='%238b4513' font-size='20'%3E国学经典%3C/text%3E%3C/svg%3E"
}
