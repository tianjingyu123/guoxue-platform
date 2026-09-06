import { isClientFeatureEnabled } from '@/lib/remote-config'

export type ClientModule = 'live' | 'merchant' | 'shop' | 'member' | 'video' | 'circle' | 'ai'

const ROUTE_MODULES: ClientModule[] = ['merchant', 'member', 'video', 'live', 'circle', 'shop', 'ai']
const ROUTE_PATTERN = /^\/(?:(pkg-merchant|merchant)|(pkg-profile\/vip|vip)|(pkg-video|videos?)|(pkg-live|live)|(pages\/circles|pkg-circle|circles?)|(pkg-(?:mall|shop|order)|shop|mall|orders)|(pkg-agent|agents?))(?:\/|$)/

export function clientModuleForRoute(value: string): ClientModule | null {
  const path = String(value || '').split('?')[0]
  if (!path || path === '/pkg-common/feature-unavailable/index') return null
  const groups = path.match(ROUTE_PATTERN)?.slice(1)
  const index = groups?.findIndex(Boolean) ?? -1
  return index < 0 ? null : ROUTE_MODULES[index]
}

export function isClientModuleEnabled(module: ClientModule): boolean {
  // 模块总闸不是发布资格：旧服务端未配置时保留原有入口，明确 false 才停用。
  // 展示入口不授予发文、开播、接单或支付权限，这些仍由各业务服务端裁决。
  return isClientFeatureEnabled(`client_module_${module}`, true)
}

export function isClientRouteEnabled(value: string): boolean {
  const module = clientModuleForRoute(value)
  return module === null || isClientModuleEnabled(module)
}

export function clientFeatureUnavailableRoute(module: ClientModule): string {
  return `/pkg-common/feature-unavailable/index?module=${encodeURIComponent(module)}`
}

export function isClientContentTypeEnabled(type: unknown): boolean {
  const normalized = String(type || '').toLowerCase()
  const module = ({ live: 'live', video: 'video', circle: 'circle', post: 'circle', product: 'shop', agent: 'ai', bot: 'ai' } as Record<string, ClientModule | undefined>)[normalized]
  return !module || isClientModuleEnabled(module)
}
