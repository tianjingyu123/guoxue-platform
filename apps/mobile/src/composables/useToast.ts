/**
 * 全平台统一 Toast 入口。
 * 病灶：全站 559 处直接 uni.showToast，无四色语义、无统一封装。
 * 解药：所有提示统一走这里，按 成功/错误/警告/信息 四类语义调用。
 *
 * 用法：
 *   import { toast } from '@/composables/useToast'
 *   toast.success('已保存')
 *   toast.error('网络异常')
 *   await toast.loading('提交中'); ...; toast.hide()
 *
 * 说明：uni.showToast 原生 icon 仅支持 success/error/loading/none，
 * warning/info 走 none（纯文字），视觉分色后续可由自定义 toast 组件增强，
 * 但调用入口在此统一后，全局替换/升级只需改这一处。
 */
type ToastType = 'success' | 'error' | 'warning' | 'info'

interface ToastOptions {
  /** 停留毫秒，默认 2000 */
  duration?: number
  /** 是否显示透明蒙层防穿透，默认 false */
  mask?: boolean
}

const ICON_MAP: Record<ToastType, 'success' | 'error' | 'none'> = {
  success: 'success',
  error: 'error',
  warning: 'none',
  info: 'none',
}

function show(type: ToastType, title: string, options?: ToastOptions) {
  uni.showToast({
    title,
    icon: ICON_MAP[type],
    duration: options?.duration ?? 2000,
    mask: options?.mask ?? false,
  })
}

export const toast = {
  success: (title: string, options?: ToastOptions) => show('success', title, options),
  error: (title: string, options?: ToastOptions) => show('error', title, options),
  warning: (title: string, options?: ToastOptions) => show('warning', title, options),
  info: (title: string, options?: ToastOptions) => show('info', title, options),
  /** 持续 loading，需手动 hide() */
  loading: (title = '加载中') =>
    uni.showToast({ title, icon: 'loading', duration: 100000, mask: true }),
  hide: () => uni.hideToast(),
}

/** 组合式写法别名，保持与项目 useXxx 习惯一致 */
export function useToast() {
  return toast
}
