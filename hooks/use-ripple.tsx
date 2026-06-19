"use client"

import { useCallback, useState } from "react"

interface RippleStyle {
  left: number
  top: number
  width: number
  height: number
}

// ============================================
// 涟漪效果 Hook
// 为卡片和按钮提供Material Design风格的点击反馈
// ============================================
export function useRipple() {
  const [ripples, setRipples] = useState<RippleStyle[]>([])

  const addRipple = useCallback((event: React.MouseEvent<HTMLElement>) => {
    const element = event.currentTarget
    const rect = element.getBoundingClientRect()
    
    const size = Math.max(rect.width, rect.height)
    const x = event.clientX - rect.left - size / 2
    const y = event.clientY - rect.top - size / 2

    const newRipple: RippleStyle = {
      left: x,
      top: y,
      width: size,
      height: size
    }

    setRipples(prev => [...prev, newRipple])

    // 动画结束后移除
    setTimeout(() => {
      setRipples(prev => prev.slice(1))
    }, 600)
  }, [])

  const RippleContainer = useCallback(() => (
    <>
      {ripples.map((ripple, index) => (
        <span
          key={index}
          className="ripple-effect"
          style={{
            left: ripple.left,
            top: ripple.top,
            width: ripple.width,
            height: ripple.height
          }}
        />
      ))}
    </>
  ), [ripples])

  return { addRipple, RippleContainer }
}
