import { navigateTo } from '@/utils/router'

/**
 * 交易、履约和服务场景的统一投诉入口。
 * 投诉走真实「意见反馈」工单链路，不混入内容审核举报池。
 */
export function gotoComplaint(scene: string, reference?: string): void {
  const query = [
    'type=complaint',
    `source=${encodeURIComponent(scene.slice(0, 30))}`,
    reference ? `reference=${encodeURIComponent(reference.slice(0, 80))}` : '',
  ].filter(Boolean).join('&')
  navigateTo(`/feedback?${query}`)
}

