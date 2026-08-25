/**
 * 全端远程配置 V1。
 *
 * 安全原则：
 * - 只接受服务端白名单字段和布尔功能开关，不执行脚本、不动态加载组件；
 * - 请求失败时使用最近一次有效快照，再退回内置默认值，绝不阻断启动；
 * - 预发布与正式环境缓存隔离，避免覆盖安装测试包后串用配置；
 * - 未识别字段自动忽略，保证 N/N-1 客户端兼容。
 */
import { apiGetOptionalAuth } from '@/utils/request'

export type ClientEnvironment = 'development' | 'staging' | 'production'

export interface RemoteUiConfig {
  home: { bigCardInterval: number }
  agentCard: { categoryColors: Record<string, string> }
}

export interface RemoteConfigSnapshot {
  schemaVersion: 1
  revision: string
  generatedAt: string
  cacheTtlSeconds: number
  environment: ClientEnvironment
  features: Record<string, boolean>
  ui: RemoteUiConfig
  maintenance: { enabled: boolean }
}

interface CachedRemoteConfig {
  fetchedAt: number
  snapshot: RemoteConfigSnapshot
}

const OFFLINE_CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000
const FEATURE_KEY_RE = /^[a-z][a-z0-9._-]{1,63}$/
const COLOR_CLASS_RE = /^g-[a-z0-9-]{1,32}$/

const EXPECTED_ENVIRONMENT: ClientEnvironment = (() => {
  const apiUrl = String((import.meta as any).env?.VITE_API_URL || '').toLowerCase()
  if (apiUrl.includes('pre-api.rebugx.cn')) return 'staging'
  if (apiUrl.includes('api.rebugx.cn')) return 'production'
  return 'development'
})()

// 同一设备覆盖安装预发布/正式包时仍各自保留最近有效快照，绝不串用。
const STORAGE_KEY = `client:remote-config:v1:${EXPECTED_ENVIRONMENT}`
const MAINTENANCE_NOTICE_KEY = `client:maintenance:last-revision:${EXPECTED_ENVIRONMENT}`

const DEFAULT_FEATURES: Record<string, boolean> = {
  client_wechat_app_login: false,
  live_start: true,
  member_purchase: true,
  merchant_onboarding: false,
  shop_checkout: true,
}

const DEFAULT_UI: RemoteUiConfig = {
  home: { bigCardInterval: 6 },
  agentCard: {
    categoryColors: {
      文案生成: 'g-copy',
      分析报告: 'g-analyze',
      古籍查询: 'g-classic',
      办公效率: 'g-office',
    },
  },
}

function defaultSnapshot(): RemoteConfigSnapshot {
  return {
    schemaVersion: 1,
    revision: 'builtin-v1',
    generatedAt: '',
    cacheTtlSeconds: 60,
    environment: EXPECTED_ENVIRONMENT,
    features: { ...DEFAULT_FEATURES },
    ui: DEFAULT_UI,
    maintenance: { enabled: false },
  }
}

let current = defaultSnapshot()
let fetchedAt = 0
let inflight: Promise<RemoteConfigSnapshot> | null = null

function finiteInt(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(max, Math.max(min, Math.round(parsed)))
}

function sanitizeFeatures(value: unknown): Record<string, boolean> {
  const result = { ...DEFAULT_FEATURES }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return result
  for (const [key, enabled] of Object.entries(value as Record<string, unknown>)) {
    if (FEATURE_KEY_RE.test(key) && typeof enabled === 'boolean') result[key] = enabled
  }
  return result
}

function sanitizeCategoryColors(value: unknown): Record<string, string> {
  const result = { ...DEFAULT_UI.agentCard.categoryColors }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return result
  for (const [category, cssClass] of Object.entries(value as Record<string, unknown>).slice(0, 50)) {
    if (category.length <= 40 && typeof cssClass === 'string' && COLOR_CLASS_RE.test(cssClass)) {
      result[category] = cssClass
    }
  }
  return result
}

function sanitizeSnapshot(value: unknown): RemoteConfigSnapshot | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const raw = value as Record<string, any>
  if (raw.schemaVersion !== 1) return null
  if (!['development', 'staging', 'production'].includes(raw.environment)) return null
  if (EXPECTED_ENVIRONMENT !== 'development' && raw.environment !== EXPECTED_ENVIRONMENT) return null

  return {
    schemaVersion: 1,
    revision: typeof raw.revision === 'string' && /^[0-9a-z-]{1,64}$/i.test(raw.revision)
      ? raw.revision
      : 'unknown',
    generatedAt: typeof raw.generatedAt === 'string' ? raw.generatedAt : '',
    cacheTtlSeconds: finiteInt(raw.cacheTtlSeconds, 60, 30, 3600),
    environment: raw.environment,
    features: sanitizeFeatures(raw.features),
    ui: {
      home: {
        bigCardInterval: finiteInt(raw.ui?.home?.bigCardInterval, 6, 1, 30),
      },
      agentCard: {
        categoryColors: sanitizeCategoryColors(raw.ui?.agentCard?.categoryColors),
      },
    },
    maintenance: { enabled: raw.maintenance?.enabled === true },
  }
}

function readCache(): CachedRemoteConfig | null {
  try {
    const raw = uni.getStorageSync(STORAGE_KEY) as CachedRemoteConfig | string | null
    const parsed = typeof raw === 'string' ? JSON.parse(raw) as CachedRemoteConfig : raw
    if (!parsed || !Number.isFinite(parsed.fetchedAt)) return null
    if (Date.now() - parsed.fetchedAt > OFFLINE_CACHE_MAX_AGE) return null
    const snapshot = sanitizeSnapshot(parsed.snapshot)
    return snapshot ? { fetchedAt: parsed.fetchedAt, snapshot } : null
  } catch {
    return null
  }
}

function persist(snapshot: RemoteConfigSnapshot, time: number): void {
  try {
    uni.setStorageSync(STORAGE_KEY, { fetchedAt: time, snapshot })
  } catch {
    // 存储空间不足不能影响当前会话使用配置。
  }
}

function applyCacheIfNeeded(): void {
  if (fetchedAt > 0) return
  const cached = readCache()
  if (!cached) return
  current = cached.snapshot
  fetchedAt = cached.fetchedAt
}

export function getRemoteConfig(): RemoteConfigSnapshot {
  applyCacheIfNeeded()
  return current
}

export function isClientFeatureEnabled(key: string, fallback?: boolean): boolean {
  const features = getRemoteConfig().features
  return typeof features[key] === 'boolean' ? features[key] : (fallback ?? false)
}

export function hydrateRemoteConfig(force = false): Promise<RemoteConfigSnapshot> {
  applyCacheIfNeeded()
  const ttlMs = current.cacheTtlSeconds * 1000
  if (!force && fetchedAt > 0 && Date.now() - fetchedAt < ttlMs) return Promise.resolve(current)
  if (inflight) return inflight

  inflight = apiGetOptionalAuth<unknown>('/config/client')
    .then((response) => {
      const snapshot = sanitizeSnapshot(response)
      if (!snapshot) return current
      current = snapshot
      fetchedAt = Date.now()
      persist(snapshot, fetchedAt)
      return current
    })
    .catch(() => current)
    .finally(() => { inflight = null })
  return inflight
}

/** 维护提示只展示一次；维护模式不锁死客户端，具体不可用接口仍由服务端裁决。 */
export function notifyMaintenanceIfNeeded(snapshot = getRemoteConfig()): void {
  if (!snapshot.maintenance.enabled) return
  try {
    if (uni.getStorageSync(MAINTENANCE_NOTICE_KEY) === snapshot.revision) return
    uni.setStorageSync(MAINTENANCE_NOTICE_KEY, snapshot.revision)
    uni.showModal({
      title: '系统维护提示',
      content: '系统正在进行维护，部分功能可能暂时不可用。已完成的订单和个人权益不会受到影响，请稍后重试。',
      showCancel: false,
      confirmText: '我知道了',
    })
  } catch {
    // 提示失败不影响启动。
  }
}
