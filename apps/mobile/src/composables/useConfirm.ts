/**
 * 全平台统一确认弹窗入口。
 * 病灶：全站 40 处直接 uni.showModal，危险操作（删除/注销/退款）无统一红色警示。
 * 解药：统一走这里，危险操作传 danger: true 自动红色确认按钮。
 *
 * 用法：
 *   import { useConfirm } from '@/composables/useConfirm'
 *   const { confirm } = useConfirm()
 *   if (await confirm({ content: '确定删除这条笔记？', danger: true })) { ... }
 */
interface ConfirmOptions {
  title?: string
  content: string
  confirmText?: string
  cancelText?: string
  /** 危险操作（删除/注销等）→ 确认按钮显示红色 */
  danger?: boolean
  /** 仅提示无取消按钮 */
  showCancel?: boolean
}

// confirmColor 是原生 JS 字符串参数，无法用 CSS 变量，故此处必须写死 hex。
// 与 tokens.scss 的 --brand(#c41e3a) / --danger(#ff4d4f) 保持一致。
const BRAND = '#c41e3a'
const DANGER = '#ff4d4f'

export function useConfirm() {
  function confirm(options: ConfirmOptions): Promise<boolean> {
    return new Promise((resolve) => {
      uni.showModal({
        title: options.title ?? '提示',
        content: options.content,
        showCancel: options.showCancel ?? true,
        confirmText: options.confirmText ?? '确定',
        cancelText: options.cancelText ?? '取消',
        confirmColor: options.danger ? DANGER : BRAND,
        cancelColor: '#999999',
        success: (res) => resolve(!!res.confirm),
        fail: () => resolve(false),
      })
    })
  }
  return { confirm }
}
