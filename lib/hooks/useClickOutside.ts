"use client"

import { useEffect, RefObject } from "react"

/**
 * 点击外部区域 Hook
 * @param ref 目标元素的 ref
 * @param handler 点击外部时的回调
 * @param enabled 是否启用（默认启用）
 */
export function useClickOutside<T extends HTMLElement = HTMLElement>(
  ref: RefObject<T>,
  handler: (event: MouseEvent | TouchEvent) => void,
  enabled: boolean = true
): void {
  useEffect(() => {
    if (!enabled) return

    const listener = (event: MouseEvent | TouchEvent) => {
      const el = ref?.current
      // 如果点击的是元素内部，则不触发
      if (!el || el.contains(event.target as Node)) {
        return
      }
      handler(event)
    }

    document.addEventListener("mousedown", listener)
    document.addEventListener("touchstart", listener)

    return () => {
      document.removeEventListener("mousedown", listener)
      document.removeEventListener("touchstart", listener)
    }
  }, [ref, handler, enabled])
}

/**
 * 按下 Escape 键 Hook
 * @param handler 按下 Escape 时的回调
 * @param enabled 是否启用（默认启用）
 */
export function useEscapeKey(
  handler: () => void,
  enabled: boolean = true
): void {
  useEffect(() => {
    if (!enabled) return

    const listener = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handler()
      }
    }

    document.addEventListener("keydown", listener)
    return () => {
      document.removeEventListener("keydown", listener)
    }
  }, [handler, enabled])
}
