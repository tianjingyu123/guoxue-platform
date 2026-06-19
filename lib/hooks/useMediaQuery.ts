"use client"

import { useState, useEffect } from "react"

// 预定义断点
const breakpoints = {
  sm: "(min-width: 640px)",
  md: "(min-width: 768px)",
  lg: "(min-width: 1024px)",
  xl: "(min-width: 1280px)",
  "2xl": "(min-width: 1536px)",
  mobile: "(max-width: 767px)",
  tablet: "(min-width: 768px) and (max-width: 1023px)",
  desktop: "(min-width: 1024px)",
  portrait: "(orientation: portrait)",
  landscape: "(orientation: landscape)",
  dark: "(prefers-color-scheme: dark)",
  light: "(prefers-color-scheme: light)",
  reducedMotion: "(prefers-reduced-motion: reduce)",
}

type BreakpointKey = keyof typeof breakpoints

/**
 * 媒体查询 Hook
 * @param query 媒体查询字符串或预定义断点键名
 */
export function useMediaQuery(query: string | BreakpointKey): boolean {
  const resolvedQuery = query in breakpoints ? breakpoints[query as BreakpointKey] : query

  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window === "undefined") {
      return false
    }
    return window.matchMedia(resolvedQuery).matches
  })

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    const mediaQuery = window.matchMedia(resolvedQuery)
    setMatches(mediaQuery.matches)

    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches)
    }

    mediaQuery.addEventListener("change", handler)
    return () => {
      mediaQuery.removeEventListener("change", handler)
    }
  }, [resolvedQuery])

  return matches
}

/**
 * 判断是否为移动端
 */
export function useIsMobile(): boolean {
  return useMediaQuery("mobile")
}

/**
 * 判断是否为平板
 */
export function useIsTablet(): boolean {
  return useMediaQuery("tablet")
}

/**
 * 判断是否为桌面端
 */
export function useIsDesktop(): boolean {
  return useMediaQuery("desktop")
}

/**
 * 判断是否为深色模式偏好
 */
export function usePrefersDark(): boolean {
  return useMediaQuery("dark")
}

/**
 * 判断用户是否偏好减少动画
 */
export function usePrefersReducedMotion(): boolean {
  return useMediaQuery("reducedMotion")
}
