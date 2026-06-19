"use client"

import { useState, useCallback } from "react"

interface CopyToClipboardResult {
  copied: boolean
  copy: (text: string) => Promise<boolean>
  reset: () => void
}

/**
 * 复制到剪贴板 Hook
 * @param resetDelay 复制成功后自动重置状态的延迟（毫秒），默认2000ms
 */
export function useCopyToClipboard(resetDelay: number = 2000): CopyToClipboardResult {
  const [copied, setCopied] = useState(false)

  const copy = useCallback(
    async (text: string): Promise<boolean> => {
      if (!navigator?.clipboard) {
        console.warn("[useCopyToClipboard] 剪贴板API不可用")
        return false
      }

      try {
        await navigator.clipboard.writeText(text)
        setCopied(true)

        // 自动重置
        if (resetDelay > 0) {
          setTimeout(() => {
            setCopied(false)
          }, resetDelay)
        }

        return true
      } catch (error) {
        console.warn("[useCopyToClipboard] 复制失败:", error)
        setCopied(false)
        return false
      }
    },
    [resetDelay]
  )

  const reset = useCallback(() => {
    setCopied(false)
  }, [])

  return { copied, copy, reset }
}
