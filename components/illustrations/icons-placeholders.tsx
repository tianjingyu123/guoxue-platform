"use client"

// 功能图标和占位图组件 - 现代简约 + 东方美学风格
// 配色：故宫红#C41E3A、宣纸米白#F5F1EB、金色#C9A96E、墨色#2C2C2C

interface IconProps {
  size?: number
  className?: string
  variant?: "line" | "fill"
}

// 排盘图标（罗盘/太极）
export function PaipanIcon({ size = 24, className, variant = "line" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="10" stroke="#C41E3A" strokeWidth="1.5" fill={variant === "fill" ? "#C41E3A" : "none"} opacity={variant === "fill" ? 0.1 : 1} />
      <circle cx="12" cy="12" r="6" stroke="#C41E3A" strokeWidth="1" fill="none" />
      {/* 太极 */}
      <path d="M12 6 A6 6 0 0 1 12 18 A3 3 0 0 1 12 12 A3 3 0 0 0 12 6" fill="#C41E3A" />
      <circle cx="12" cy="9" r="1" fill={variant === "fill" ? "#C41E3A" : "#F5F1EB"} />
      <circle cx="12" cy="15" r="1" fill={variant === "fill" ? "#F5F1EB" : "#C41E3A"} />
    </svg>
  )
}

// 圈子图标（茶席/蒲团）
export function CircleIcon({ size = 24, className, variant = "line" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <ellipse cx="12" cy="12" rx="9" ry="4" stroke="#C41E3A" strokeWidth="1.5" fill={variant === "fill" ? "#C41E3A" : "none"} opacity={variant === "fill" ? 0.1 : 1} />
      <ellipse cx="12" cy="10" rx="3" ry="1.5" stroke="#C41E3A" strokeWidth="1" fill="none" />
      {/* 蒲团 */}
      <ellipse cx="6" cy="18" rx="3" ry="1.5" fill={variant === "fill" ? "#C41E3A" : "none"} stroke="#C41E3A" strokeWidth="1" />
      <ellipse cx="12" cy="20" rx="3" ry="1.5" fill={variant === "fill" ? "#C41E3A" : "none"} stroke="#C41E3A" strokeWidth="1" />
      <ellipse cx="18" cy="18" rx="3" ry="1.5" fill={variant === "fill" ? "#C41E3A" : "none"} stroke="#C41E3A" strokeWidth="1" />
    </svg>
  )
}

// 课程图标（书卷/竹简）
export function CourseIcon({ size = 24, className, variant = "line" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="4" y="4" width="16" height="16" rx="2" stroke="#C41E3A" strokeWidth="1.5" fill={variant === "fill" ? "#C41E3A" : "none"} opacity={variant === "fill" ? 0.1 : 1} />
      {/* 竹简条纹 */}
      <line x1="7" y1="4" x2="7" y2="20" stroke="#C41E3A" strokeWidth="1" />
      <line x1="11" y1="4" x2="11" y2="20" stroke="#C41E3A" strokeWidth="1" />
      <line x1="15" y1="4" x2="15" y2="20" stroke="#C41E3A" strokeWidth="1" />
      {/* 绑绳 */}
      <line x1="4" y1="8" x2="20" y2="8" stroke="#C9A96E" strokeWidth="1.5" />
      <line x1="4" y1="16" x2="20" y2="16" stroke="#C9A96E" strokeWidth="1.5" />
    </svg>
  )
}

// 商城图标（如意/铜钱）
export function MallIcon({ size = 24, className, variant = "line" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      {/* 如意头 */}
      <path d="M6 10 Q4 6 8 4 Q14 3 16 8 Q17 12 12 14 Q9 15 8 18" 
            stroke="#C41E3A" strokeWidth="1.5" fill={variant === "fill" ? "#C41E3A" : "none"} opacity={variant === "fill" ? 0.1 : 1} />
      {/* 如意柄 */}
      <line x1="8" y1="18" x2="10" y2="22" stroke="#C41E3A" strokeWidth="2" strokeLinecap="round" />
      {/* 铜钱装饰 */}
      <circle cx="18" cy="16" r="4" stroke="#C9A96E" strokeWidth="1.5" fill={variant === "fill" ? "#C9A96E" : "none"} opacity={variant === "fill" ? 0.2 : 1} />
      <rect x="16.5" y="14.5" width="3" height="3" stroke="#C9A96E" strokeWidth="1" fill="none" />
    </svg>
  )
}

// 发现图标（司南/罗盘）
export function DiscoverIcon({ size = 24, className, variant = "line" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="9" stroke="#C41E3A" strokeWidth="1.5" fill={variant === "fill" ? "#C41E3A" : "none"} opacity={variant === "fill" ? 0.1 : 1} />
      {/* 指针 */}
      <path d="M12 5 L10 12 L12 10 L14 12 Z" fill="#C41E3A" />
      <path d="M12 19 L10 12 L12 14 L14 12 Z" fill="#C9A96E" />
      {/* 方位点 */}
      <circle cx="12" cy="4" r="1" fill="#C41E3A" />
      <circle cx="12" cy="20" r="1" fill="#C9A96E" />
      <circle cx="4" cy="12" r="1" fill="#2C2C2C" />
      <circle cx="20" cy="12" r="1" fill="#2C2C2C" />
    </svg>
  )
}

// 内容封面占位图
export function CoverPlaceholder({ width = 160, height = 90, className }: { width?: number, height?: number, className?: string }) {
  return (
    <svg width={width} height={height} viewBox="0 0 160 90" fill="none" className={className}>
      {/* 宣纸纹理背景 */}
      <rect width="160" height="90" fill="#F5F1EB" />
      <g opacity="0.1">
        {[...Array(20)].map((_, i) => (
          <line key={i} x1={i * 8} y1="0" x2={i * 8} y2="90" stroke="#C9A96E" strokeWidth="0.5" />
        ))}
        {[...Array(12)].map((_, i) => (
          <line key={i} x1="0" y1={i * 8} x2="160" y2={i * 8} stroke="#C9A96E" strokeWidth="0.5" />
        ))}
      </g>
      {/* 中心书卷图标 */}
      <g transform="translate(60, 25)">
        <rect x="0" y="0" width="40" height="40" rx="4" fill="none" stroke="#C9A96E" strokeWidth="1" />
        <path d="M8 10 Q5 20 8 30" stroke="#C9A96E" strokeWidth="1" fill="none" />
        <path d="M32 10 Q35 20 32 30" stroke="#C9A96E" strokeWidth="1" fill="none" />
        <line x1="12" y1="15" x2="28" y2="15" stroke="#C9A96E" strokeWidth="0.5" />
        <line x1="12" y1="20" x2="28" y2="20" stroke="#C9A96E" strokeWidth="0.5" />
        <line x1="12" y1="25" x2="24" y2="25" stroke="#C9A96E" strokeWidth="0.5" />
      </g>
    </svg>
  )
}

// 启动页插画：日出山间云海 + 古松 + 远山
export function SplashIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 375 812" fill="none" className={className}>
      {/* 渐变天空背景 */}
      <defs>
        <linearGradient id="skyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFE4C9" />
          <stop offset="30%" stopColor="#FFF5E8" />
          <stop offset="60%" stopColor="#F5F1EB" />
          <stop offset="100%" stopColor="#E8E0D8" />
        </linearGradient>
        <radialGradient id="sunGlow" cx="50%" cy="30%" r="50%">
          <stop offset="0%" stopColor="#C9A96E" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#C9A96E" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="375" height="812" fill="url(#skyGradient)" />
      
      {/* 日出光芒 */}
      <circle cx="187.5" cy="250" r="150" fill="url(#sunGlow)" />
      <circle cx="187.5" cy="280" r="40" fill="#C9A96E" opacity="0.8" />
      
      {/* 远山 */}
      <path d="M0 450 Q100 350 187.5 380 Q275 350 375 420 L375 812 L0 812 Z" fill="#2C2C2C" opacity="0.15" />
      <path d="M0 500 Q80 420 150 450 Q220 400 300 440 Q350 420 375 450 L375 812 L0 812 Z" fill="#2C2C2C" opacity="0.25" />
      
      {/* 云海 */}
      <g fill="#F5F1EB" opacity="0.9">
        <ellipse cx="100" cy="480" rx="80" ry="25" />
        <ellipse cx="250" cy="470" rx="100" ry="30" />
        <ellipse cx="50" cy="500" rx="60" ry="20" />
        <ellipse cx="320" cy="490" rx="70" ry="22" />
        <ellipse cx="180" cy="510" rx="90" ry="28" />
      </g>
      
      {/* 古松 */}
      <g transform="translate(280, 380)">
        {/* 树干 */}
        <path d="M20 0 Q15 50 25 120 Q30 180 20 250" stroke="#2C2C2C" strokeWidth="8" fill="none" />
        <path d="M20 60 Q-10 40 -30 50" stroke="#2C2C2C" strokeWidth="4" fill="none" />
        <path d="M20 100 Q50 80 70 90" stroke="#2C2C2C" strokeWidth="3" fill="none" />
        {/* 松针簇 */}
        <ellipse cx="-35" cy="45" rx="25" ry="15" fill="#2C2C2C" opacity="0.6" />
        <ellipse cx="75" cy="85" rx="20" ry="12" fill="#2C2C2C" opacity="0.6" />
        <ellipse cx="15" cy="20" rx="30" ry="18" fill="#2C2C2C" opacity="0.7" />
      </g>
      
      {/* 紫气祥云 */}
      <g opacity="0.4">
        <ellipse cx="100" cy="300" rx="50" ry="15" fill="#C41E3A" />
        <ellipse cx="280" cy="320" rx="40" ry="12" fill="#C41E3A" />
        <ellipse cx="180" cy="340" rx="60" ry="18" fill="#C9A96E" />
      </g>
      
      {/* Logo区域 */}
      <g transform="translate(137.5, 580)">
        <rect x="0" y="0" width="100" height="100" rx="20" fill="#C41E3A" />
        <g fill="#F5F1EB">
          <rect x="25" y="20" width="50" height="5" />
          <rect x="47" y="20" width="6" height="25" />
          <rect x="30" y="42" width="40" height="5" />
          <path d="M30 55 L35 70 L50 60 L65 70 L70 55" stroke="#F5F1EB" strokeWidth="4" fill="none" />
          <rect x="40" y="75" width="20" height="5" />
        </g>
      </g>
      
      {/* 品牌名 */}
      <text x="187.5" y="720" textAnchor="middle" fontSize="28" fill="#2C2C2C" fontFamily="serif" fontWeight="bold">热卜国学</text>
      <text x="187.5" y="750" textAnchor="middle" fontSize="14" fill="#2C2C2C" opacity="0.6" fontFamily="serif">探索易学智慧 · 传承国学文化</text>
    </svg>
  )
}

// 平台Logo（印章样式）
export function PlatformLogo({ size = 48, className }: { size?: number, className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <rect width="48" height="48" rx="10" fill="#C41E3A" />
      <g fill="#F5F1EB">
        {/* 简化"热"字 */}
        <rect x="12" y="10" width="24" height="3" rx="1" />
        <rect x="22" y="10" width="4" height="12" />
        <rect x="14" y="20" width="20" height="3" rx="1" />
        <path d="M14 28 L18 36 L24 30 L30 36 L34 28" stroke="#F5F1EB" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="18" y="38" width="12" height="3" rx="1" />
      </g>
      {/* 太极装饰（角落） */}
      <circle cx="40" cy="8" r="4" fill="none" stroke="#C9A96E" strokeWidth="0.5" opacity="0.5" />
    </svg>
  )
}
