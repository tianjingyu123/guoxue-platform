"use client"

import { cn } from "@/lib/utils"

// 方案A：极简圆形罗盘 - 细线条圆形+十字准星+刻度
export function PaipanIconA({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("w-7 h-7", className)} fill="none">
      <defs>
        <linearGradient id="goldGradA" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#D4AF37" />
          <stop offset="50%" stopColor="#C9A96E" />
          <stop offset="100%" stopColor="#B8956E" />
        </linearGradient>
      </defs>
      {/* 外圆 - 细线条 */}
      <circle cx="16" cy="16" r="13" stroke="url(#goldGradA)" strokeWidth="1.5" fill="none" />
      {/* 内圆 */}
      <circle cx="16" cy="16" r="8" stroke="url(#goldGradA)" strokeWidth="1" fill="none" opacity="0.7" />
      {/* 十字准星 */}
      <line x1="16" y1="4" x2="16" y2="10" stroke="url(#goldGradA)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="16" y1="22" x2="16" y2="28" stroke="url(#goldGradA)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="4" y1="16" x2="10" y2="16" stroke="url(#goldGradA)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="22" y1="16" x2="28" y2="16" stroke="url(#goldGradA)" strokeWidth="1.5" strokeLinecap="round" />
      {/* 中心点 */}
      <circle cx="16" cy="16" r="2" fill="url(#goldGradA)" />
    </svg>
  )
}

// 方案B：极简逗号太极 - 两个相互嵌套的逗号形状，更简洁
export function PaipanIconB({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("w-7 h-7", className)} fill="none">
      <defs>
        <linearGradient id="goldGradB" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#D4AF37" />
          <stop offset="50%" stopColor="#C9A96E" />
          <stop offset="100%" stopColor="#B8956E" />
        </linearGradient>
      </defs>
      {/* 外圆边框 */}
      <circle cx="16" cy="16" r="13" stroke="url(#goldGradB)" strokeWidth="1.5" fill="none" />
      {/* 阳鱼 - 金色半圆+逗号尾巴 */}
      <path
        d="M16 3 A13 13 0 0 1 16 29 A6.5 6.5 0 0 1 16 16 A6.5 6.5 0 0 0 16 3"
        fill="url(#goldGradB)"
      />
      {/* 阳中阴点 - 白色 */}
      <circle cx="16" cy="9.5" r="2.5" fill="#FFFFFF" />
      {/* 阴中阳点 - 金色 */}
      <circle cx="16" cy="22.5" r="2.5" fill="url(#goldGradB)" />
    </svg>
  )
}

// 方案C：极简罗盘指针 - 圆形+简约指针
export function PaipanIconC({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("w-7 h-7", className)} fill="none">
      <defs>
        <linearGradient id="goldGradC" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#D4AF37" />
          <stop offset="50%" stopColor="#C9A96E" />
          <stop offset="100%" stopColor="#B8956E" />
        </linearGradient>
      </defs>
      {/* 外圆 */}
      <circle cx="16" cy="16" r="13" stroke="url(#goldGradC)" strokeWidth="1.5" fill="none" />
      {/* 四个方位刻度 */}
      <circle cx="16" cy="5" r="1.5" fill="url(#goldGradC)" />
      <circle cx="16" cy="27" r="1.5" fill="url(#goldGradC)" />
      <circle cx="5" cy="16" r="1.5" fill="url(#goldGradC)" />
      <circle cx="27" cy="16" r="1.5" fill="url(#goldGradC)" />
      {/* 指针 - 菱形 */}
      <path
        d="M16 6 L19 16 L16 26 L13 16 Z"
        fill="url(#goldGradC)"
        opacity="0.9"
      />
      {/* 中心圆 */}
      <circle cx="16" cy="16" r="3" fill="#FFFFFF" stroke="url(#goldGradC)" strokeWidth="1" />
    </svg>
  )
}

// 展示组件
export default function PaipanIconOptions() {
  return (
    <div className="p-8 bg-[#FAF8F5] min-h-screen">
      <h1 className="text-xl font-bold text-[#2C2C2C] mb-8">排盘图标方案选择</h1>
      
      <div className="grid grid-cols-3 gap-8">
        {/* 方案A */}
        <div className="flex flex-col items-center gap-4">
          <div className="w-[52px] h-[52px] rounded-full bg-gradient-to-br from-[#C41E3A] to-[#A01830] flex items-center justify-center shadow-lg">
            <PaipanIconA className="w-7 h-7" />
          </div>
          <div className="text-center">
            <p className="font-bold text-[#2C2C2C]">方案A</p>
            <p className="text-sm text-[#6B6B6B]">极简圆形罗盘</p>
            <p className="text-xs text-[#999]">十字准星 + 双圆</p>
          </div>
        </div>
        
        {/* 方案B */}
        <div className="flex flex-col items-center gap-4">
          <div className="w-[52px] h-[52px] rounded-full bg-gradient-to-br from-[#C41E3A] to-[#A01830] flex items-center justify-center shadow-lg">
            <PaipanIconB className="w-7 h-7" />
          </div>
          <div className="text-center">
            <p className="font-bold text-[#2C2C2C]">方案B</p>
            <p className="text-sm text-[#6B6B6B]">极简太极</p>
            <p className="text-xs text-[#999]">经典阴阳鱼</p>
          </div>
        </div>
        
        {/* 方案C */}
        <div className="flex flex-col items-center gap-4">
          <div className="w-[52px] h-[52px] rounded-full bg-gradient-to-br from-[#C41E3A] to-[#A01830] flex items-center justify-center shadow-lg">
            <PaipanIconC className="w-7 h-7" />
          </div>
          <div className="text-center">
            <p className="font-bold text-[#2C2C2C]">方案C</p>
            <p className="text-sm text-[#6B6B6B]">罗盘指针</p>
            <p className="text-xs text-[#999]">菱形指针 + 方位点</p>
          </div>
        </div>
      </div>
      
      <div className="mt-12 p-4 bg-white rounded-lg shadow-sm">
        <p className="text-sm text-[#6B6B6B]">
          <strong>说明：</strong>以上三个方案都是金色渐变（#D4AF37 → #C9A96E → #B8956E），
          支持6-8秒缓慢360度自转。请选择您满意的方案，我将替换到底部导航栏。
        </p>
      </div>
    </div>
  )
}
