import { CanActivate, ExecutionContext, Injectable, NotFoundException } from '@nestjs/common'
import { FeatureFlagService } from '../modules/feature-flag/feature-flag.service'

export const CLIENT_MODULE_ROUTE_FLAGS = [
  { key: 'client_module_merchant', prefixes: ['/merchant', '/merchant-backend', '/admin/merchants'] },
  { key: 'client_module_member', prefixes: ['/member'] },
  { key: 'client_module_video', prefixes: ['/videos'] },
  { key: 'client_module_live', prefixes: ['/live'] },
  { key: 'client_module_circle', prefixes: ['/circles', '/circle-backend', '/circle-governance', '/circle-publish-grants', '/circle-knowledge'] },
  { key: 'client_module_shop', prefixes: ['/shop'] },
  { key: 'client_module_ai', prefixes: ['/ai', '/bots', '/admin/ai', '/admin/rag', '/admin/knowledge', '/platform-knowledge'] },
] as const

const CALLBACK_PATHS = [
  /^\/live\/(?:callback|trtc\/callback|audit\/callback)$/,
  /^\/videos\/vod\/callback$/,
  /^\/shop\/(?:pay\/notify|alipay\/notify|unionpay\/notify|refund\/notify|logistics\/kuaidi100\/callback)$/,
]

export function clientModuleFlagForRequest(method: string, rawUrl: string): string | null {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(String(method || '').toUpperCase())) return null
  const path = String(rawUrl || '').split('?')[0].replace(/^\/api\/v1(?=\/|$)/, '') || '/'
  if (CALLBACK_PATHS.some((pattern) => pattern.test(path))) return null
  return CLIENT_MODULE_ROUTE_FLAGS.find(({ prefixes }) => prefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`)))?.key ?? null
}

/** 审核敏感模块总闸：关闭后拒绝业务写入；支付/媒体回调保留以完成在途状态收敛。 */
@Injectable()
export class ClientModuleGuard implements CanActivate {
  constructor(private readonly featureFlags: FeatureFlagService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ method?: string; originalUrl?: string; url?: string; user?: { id?: string } }>()
    const key = clientModuleFlagForRequest(request.method || '', request.originalUrl || request.url || '')
    if (!key) return true
    // 仅模块总闸兼容缺失配置；不改变角色、发布资格、支付、红线等后续守卫。
    if (!await this.featureFlags.isEnabled(key, request.user?.id, true)) throw new NotFoundException('资源不存在')
    return true
  }
}
