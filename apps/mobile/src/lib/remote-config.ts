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
import { ref } from 'vue'
import { getToken } from '@/utils/storage'

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
const SENSITIVE_FEATURE_CACHE_MAX_AGE = 5 * 60 * 1000
const FEATURE_KEY_RE = /^[a-z][a-z0-9._-]{1,63}$/
const COLOR_CLASS_RE = /^g-[a-z0-9-]{1,32}$/

const EXPECTED_ENVIRONMENT: ClientEnvironment = (() => {
  const apiUrl = String((import.meta as any).env?.VITE_API_URL || '').toLowerCase()
  if (apiUrl.includes('pre-api.rebugx.cn')) return 'staging'
  if (apiUrl.includes('api.rebugx.cn')) return 'production'
  return 'development'
})()

// 同一设备覆盖安装预发布/正式包时仍各自保留最近有效快照，绝不串用。
// v1 未区分匿名/账号灰度，不读取旧缓存，以免升级后继承他人的开启状态。
// v2 把缺失的模块键补成 false，无法区分管理员关闭与客户端合成值，不复用。
const STORAGE_KEY = `client:remote-config:v3:${EXPECTED_ENVIRONMENT}:anonymous`
const MAINTENANCE_NOTICE_KEY = `client:maintenance:last-revision:${EXPECTED_ENVIRONMENT}`

const DEFAULT_FEATURES: Record<string, boolean> = {
  client_wechat_app_login: false,
  live_start: true,
  member_purchase: true,
  merchant_onboarding: false,
  shop_checkout: true,
}
function isSensitiveFeature(key: string): boolean {
  return key.startsWith('client_module_') || key.startsWith('client_share_') || key === 'client_wechat_app_login'
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
    ui: { home: { ...DEFAULT_UI.home }, agentCard: { categoryColors: { ...DEFAULT_UI.agentCard.categoryColors } } },
    maintenance: { enabled: false },
  }
}

let current = defaultSnapshot()
let fetchedAt = 0
let inflight: Promise<RemoteConfigSnapshot> | null = null
// 凭据只在内存比较，不写入配置缓存；退出/切换账号后不能继承上一账号的灰度结果。
let sessionToken = getToken()
let sessionEpoch = 0
let expiryTimer: ReturnType<typeof setTimeout> | null = null
let refreshTimer: ReturnType<typeof setInterval> | null = null
// 让依赖 isClientFeatureEnabled 的 computed 在远端快照更新后自动重算。
const configEpoch = ref(0)

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
    // 显式模块字段格式错误不能被当成缺失而恢复入口。
    else if (/^client_module_(live|merchant|shop|member|video|circle|ai)$/.test(key)) result[key] = false
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
    const age = Date.now() - parsed.fetchedAt
    if (age < 0 || age > OFFLINE_CACHE_MAX_AGE) return null
    const snapshot = sanitizeSnapshot(parsed.snapshot)
    if (snapshot && Date.now() - parsed.fetchedAt > SENSITIVE_FEATURE_CACHE_MAX_AGE) {
      // 普通样式可离线沿用七天；审核敏感板块的“开启”状态最多信任五分钟，超时即安全关闭。
      for (const key of Object.keys(snapshot.features)) {
        if (isSensitiveFeature(key)) snapshot.features[key] = false
      }
    }
    return snapshot ? { fetchedAt: parsed.fetchedAt, snapshot } : null
  } catch {
    return null
  }
}

function persist(snapshot: RemoteConfigSnapshot, time: number): void {
  // 已登录快照可能包含个人灰度授权，不能作为设备级离线配置保存。
  if (sessionToken) return
  try {
    uni.setStorageSync(STORAGE_KEY, { fetchedAt: time, snapshot })
  } catch {
    // 存储空间不足不能影响当前会话使用配置。
  }
}

function applyCacheIfNeeded(): void {
  if (fetchedAt > 0 || sessionToken) return
  const cached = readCache()
  if (!cached) return
  current = cached.snapshot
  fetchedAt = cached.fetchedAt
  configEpoch.value += 1
  scheduleSensitiveExpiry()
}

function ensureSession(): void {
  const token = getToken()
  if (token === sessionToken) return
  sessionToken = token
  sessionEpoch += 1
  current = defaultSnapshot()
  fetchedAt = 0
  inflight = null
  if (expiryTimer !== null) clearTimeout(expiryTimer)
  expiryTimer = null
  configEpoch.value += 1
}

function expireSensitiveFeatures(): void {
  if (!fetchedAt) return
  const age = Date.now() - fetchedAt
  if (age >= 0 && age < SENSITIVE_FEATURE_CACHE_MAX_AGE) return
  let changed = false
  const features = { ...current.features }
  for (const key of Object.keys(features)) {
    if (isSensitiveFeature(key) && features[key]) { features[key] = false; changed = true }
  }
  if (changed) { current = { ...current, features }; configEpoch.value += 1 }
}

function scheduleSensitiveExpiry(): void {
  if (expiryTimer !== null) clearTimeout(expiryTimer)
  const epoch = sessionEpoch
  expiryTimer = setTimeout(() => {
    expiryTimer = null
    if (epoch !== sessionEpoch) return
    expireSensitiveFeatures()
  }, Math.max(0, SENSITIVE_FEATURE_CACHE_MAX_AGE - (Date.now() - fetchedAt)))
}

export function getRemoteConfig(): RemoteConfigSnapshot {
  void configEpoch.value
  ensureSession()
  applyCacheIfNeeded()
  // 不能只在重启读取磁盘时过期：长时间前台/断网也必须关闭失效的敏感开关。
  expireSensitiveFeatures()
  return current
}

export function isClientFeatureEnabled(key: string, fallback?: boolean): boolean {
  void configEpoch.value
  const features = getRemoteConfig().features
  return typeof features[key] === 'boolean' ? features[key] : (fallback ?? false)
}

export function hydrateRemoteConfig(force = false): Promise<RemoteConfigSnapshot> {
  getRemoteConfig()
  // 服务端普通样式 TTL 可以较长，但不能让敏感开启状态过期后一直等到该 TTL 才刷新。
  const ttlMs = Math.min(current.cacheTtlSeconds * 1000, SENSITIVE_FEATURE_CACHE_MAX_AGE)
  const age = Date.now() - fetchedAt
  if (!force && fetchedAt > 0 && age >= 0 && age < ttlMs) return Promise.resolve(current)
  if (inflight) return inflight

  const epoch = sessionEpoch
  const request = apiGetOptionalAuth<unknown>('/config/client')
    .then((response) => {
      ensureSession()
      if (epoch !== sessionEpoch) return getRemoteConfig()
      const snapshot = sanitizeSnapshot(response)
      if (!snapshot) return getRemoteConfig()
      current = snapshot
      fetchedAt = Date.now()
      configEpoch.value += 1
      persist(snapshot, fetchedAt)
      scheduleSensitiveExpiry()
      return current
    })
    .catch(() => getRemoteConfig())
    .finally(() => { if (inflight === request) inflight = null })
  inflight = request
  return request
}

/** 只在前台低频拉取数据配置，复用缓存和同一次请求；后台不轮询。 */
export function startRemoteConfigRefresh(): void {
  if (refreshTimer !== null) return
  refreshTimer = setInterval(() => { void hydrateRemoteConfig() }, 60_000)
}

export function stopRemoteConfigRefresh(): void {
  if (refreshTimer !== null) clearInterval(refreshTimer)
  refreshTimer = null
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
