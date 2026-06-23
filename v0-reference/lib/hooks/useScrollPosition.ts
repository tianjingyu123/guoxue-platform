"use client"

import { useState, useEffect, useCallback } from "react"

interface ScrollPosition {
  x: number
  y: number
  direction: "up" | "down" | "none"
  isAtTop: boolean
  isAtBottom: boolean
}

/**
 * 滚动位置 Hook
 * @param threshold 触发方向判断的阈值（默认10px）
 */
export function useScrollPosition(threshold: number = 10): ScrollPosition {
  const [position, setPosition] = useState<ScrollPosition>({
    x: 0,
    y: 0,
    direction: "none",
    isAtTop: true,
    isAtBottom: false,
  })

  useEffect(() => {
    let lastY = window.scrollY

    const handleScroll = () => {
      const currentY = window.scrollY
      const currentX = window.scrollX
      const maxY = document.documentElement.scrollHeight - window.innerHeight

      let direction: "up" | "down" | "none" = "none"
      if (currentY - lastY > threshold) {
        direction = "down"
      } else if (lastY - currentY > threshold) {
        direction = "up"
      }

      setPosition({
        x: currentX,
        y: currentY,
        direction,
        isAtTop: currentY <= 0,
        isAtBottom: currentY >= maxY - 1,
      })

      if (direction !== "none") {
        lastY = currentY
      }
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    handleScroll() // 初始化

    return () => {
      window.removeEventListener("scroll", handleScroll)
    }
  }, [threshold])

  return position
}

/**
 * 滚动到顶部
 */
export function useScrollToTop(): () => void {
  return useCallback(() => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    })
  }, [])
}

/**
 * 滚动到指定元素
 */
export function useScrollToElement(): (elementId: string) => void {
  return useCallback((elementId: string) => {
    const element = document.getElementById(elementId)
    if (element) {
      element.scrollIntoView({
        behavior: "smooth",
        block: "start",
      })
    }
  }, [])
}
