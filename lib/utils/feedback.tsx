"use client"

import { useCallback } from "react"
import { toast } from "sonner"
import { Check, X, AlertTriangle, Info, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

// 反馈类型
type FeedbackType = "success" | "error" | "warning" | "info" | "loading"

// 国学风格反馈配置
const feedbackConfig: Record<FeedbackType, {
  icon: React.ReactNode
  className: string
  title: string
}> = {
  success: {
    icon: <Check className="w-4 h-4" />,
    className: "bg-success/10 text-success border-success/20",
    title: "操作成功",
  },
  error: {
    icon: <X className="w-4 h-4" />,
    className: "bg-danger/10 text-danger border-danger/20",
    title: "操作失败",
  },
  warning: {
    icon: <AlertTriangle className="w-4 h-4" />,
    className: "bg-warning/10 text-warning border-warning/20",
    title: "请注意",
  },
  info: {
    icon: <Info className="w-4 h-4" />,
    className: "bg-info/10 text-info border-info/20",
    title: "提示",
  },
  loading: {
    icon: <Loader2 className="w-4 h-4 animate-spin" />,
    className: "bg-muted text-foreground border-border",
    title: "处理中",
  },
}

// 国学风格消息文案
const guoxueMessages: Record<string, Record<FeedbackType, string>> = {
  save: {
    success: "已妥善保存",
    error: "保存未能完成",
    warning: "内容可能未完整保存",
    info: "正在保存中",
    loading: "正在保存...",
  },
  submit: {
    success: "提交成功，静候佳音",
    error: "提交遇阻，请稍后再试",
    warning: "部分信息可能需要补充",
    info: "即将提交",
    loading: "正在提交...",
  },
  delete: {
    success: "已成功移除",
    error: "删除未能完成",
    warning: "此操作不可撤销",
    info: "确认删除？",
    loading: "正在删除...",
  },
  follow: {
    success: "已关注，见贤思齐",
    error: "关注失败",
    warning: "关注数已达上限",
    info: "即将关注",
    loading: "正在关注...",
  },
  unfollow: {
    success: "已取消关注",
    error: "操作失败",
    warning: "",
    info: "",
    loading: "处理中...",
  },
  collect: {
    success: "已收入囊中",
    error: "收藏失败",
    warning: "收藏夹已满",
    info: "即将收藏",
    loading: "正在收藏...",
  },
  uncollect: {
    success: "已从收藏移除",
    error: "操作失败",
    warning: "",
    info: "",
    loading: "处理中...",
  },
  share: {
    success: "链接已复制，分享好友",
    error: "分享失败",
    warning: "",
    info: "准备分享",
    loading: "生成分享链接...",
  },
  copy: {
    success: "已复制到剪贴板",
    error: "复制失败",
    warning: "",
    info: "",
    loading: "",
  },
  pay: {
    success: "支付成功",
    error: "支付未完成",
    warning: "余额不足",
    info: "即将跳转支付",
    loading: "正在处理支付...",
  },
  join: {
    success: "欢迎入门，共同精进",
    error: "加入失败",
    warning: "名额已满",
    info: "即将加入",
    loading: "正在加入...",
  },
  login: {
    success: "欢迎回来",
    error: "登录失败，请重试",
    warning: "账号或密码有误",
    info: "正在验证",
    loading: "正在登录...",
  },
  register: {
    success: "注册成功，开启国学之旅",
    error: "注册失败",
    warning: "该手机号已注册",
    info: "即将完成注册",
    loading: "正在注册...",
  },
  upload: {
    success: "上传成功",
    error: "上传失败",
    warning: "文件过大",
    info: "准备上传",
    loading: "正在上传...",
  },
  download: {
    success: "下载完成",
    error: "下载失败",
    warning: "网络不稳定",
    info: "开始下载",
    loading: "正在下载...",
  },
  network: {
    success: "网络已恢复",
    error: "网络连接失败",
    warning: "网络不稳定",
    info: "正在连接",
    loading: "连接中...",
  },
}

// 显示反馈Toast
export function showFeedback(
  type: FeedbackType,
  message?: string,
  options?: {
    action?: string
    duration?: number
    description?: string
  }
) {
  const config = feedbackConfig[type]
  
  const toastOptions = {
    description: options?.description,
    duration: options?.duration || (type === "loading" ? Infinity : 3000),
    action: options?.action ? {
      label: options.action,
      onClick: () => {},
    } : undefined,
  }
  
  switch (type) {
    case "success":
      toast.success(message || config.title, toastOptions)
      break
    case "error":
      toast.error(message || config.title, toastOptions)
      break
    case "warning":
      toast.warning(message || config.title, toastOptions)
      break
    case "info":
      toast.info(message || config.title, toastOptions)
      break
    case "loading":
      toast.loading(message || config.title, toastOptions)
      break
  }
}

// 快捷方法 - 根据场景自动选择文案
export function showActionFeedback(
  action: keyof typeof guoxueMessages,
  type: FeedbackType,
  customMessage?: string
) {
  const message = customMessage || guoxueMessages[action]?.[type] || feedbackConfig[type].title
  showFeedback(type, message)
}

// Hook: 提供便捷的反馈方法
export function useFeedback() {
  const success = useCallback((message?: string) => {
    showFeedback("success", message)
  }, [])
  
  const error = useCallback((message?: string) => {
    showFeedback("error", message)
  }, [])
  
  const warning = useCallback((message?: string) => {
    showFeedback("warning", message)
  }, [])
  
  const info = useCallback((message?: string) => {
    showFeedback("info", message)
  }, [])
  
  const loading = useCallback((message?: string) => {
    return toast.loading(message || "处理中...")
  }, [])
  
  const dismiss = useCallback((toastId?: string | number) => {
    toast.dismiss(toastId)
  }, [])
  
  // 场景化快捷方法
  const action = useCallback((
    actionType: keyof typeof guoxueMessages,
    feedbackType: FeedbackType,
    customMessage?: string
  ) => {
    showActionFeedback(actionType, feedbackType, customMessage)
  }, [])
  
  return {
    success,
    error,
    warning,
    info,
    loading,
    dismiss,
    action,
    // 常用操作快捷方式
    saved: () => action("save", "success"),
    saveFailed: () => action("save", "error"),
    submitted: () => action("submit", "success"),
    submitFailed: () => action("submit", "error"),
    deleted: () => action("delete", "success"),
    deleteFailed: () => action("delete", "error"),
    followed: () => action("follow", "success"),
    unfollowed: () => action("unfollow", "success"),
    collected: () => action("collect", "success"),
    uncollected: () => action("uncollect", "success"),
    copied: () => action("copy", "success"),
    shared: () => action("share", "success"),
    joined: () => action("join", "success"),
  }
}

// 导出类型
export type { FeedbackType }
