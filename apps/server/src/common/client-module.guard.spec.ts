import { NotFoundException } from '@nestjs/common'
import { ClientModuleGuard, clientModuleFlagForRequest } from './client-module.guard'

describe('ClientModuleGuard', () => {
  it.each([
    ['POST', '/api/v1/live/rooms/x/start', 'client_module_live'],
    ['POST', '/api/v1/shop/orders', 'client_module_shop'],
    ['POST', '/api/v1/merchant/apply', 'client_module_merchant'],
    ['POST', '/api/v1/member/purchase/x', 'client_module_member'],
    ['POST', '/api/v1/videos', 'client_module_video'],
    ['POST', '/api/v1/circles/x/posts', 'client_module_circle'],
    ['POST', '/api/v1/ai/chat', 'client_module_ai'],
  ])('识别 %s %s', (method, url, expected) => {
    expect(clientModuleFlagForRequest(method, url)).toBe(expected)
  })

  it.each([
    ['GET', '/api/v1/live/rooms/x'],
    ['POST', '/api/v1/live/callback'],
    ['POST', '/api/v1/live/trtc/callback'],
    ['POST', '/api/v1/videos/vod/callback'],
    ['POST', '/api/v1/shop/pay/notify'],
  ])('只读和可信回调不被总闸截断：%s %s', (method, url) => {
    expect(clientModuleFlagForRequest(method, url)).toBeNull()
  })

  it('关闭时返回隐藏资源的 404，开启时放行', async () => {
    const featureFlags = { isEnabled: jest.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true) }
    const guard = new ClientModuleGuard(featureFlags as any)
    const context = {
      switchToHttp: () => ({ getRequest: () => ({ method: 'POST', originalUrl: '/api/v1/videos', user: { id: 'u1' } }) }),
    } as any
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(NotFoundException)
    await expect(guard.canActivate(context)).resolves.toBe(true)
    expect(featureFlags.isEnabled).toHaveBeenCalledWith('client_module_video', 'u1', true)
  })
})
