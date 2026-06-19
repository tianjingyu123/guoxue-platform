"use client"

// 默认头像组件 - 现代简约 + 东方美学风格
// 配色：故宫红#C41E3A、宣纸米白#F5F1EB、金色#C9A96E、墨色#2C2C2C

interface AvatarProps {
  size?: number
  className?: string
}

// 1. 男性默认头像：宣纸色底 + 简洁的古人冠帽轮廓（墨色线条）
export function MaleDefaultAvatar({ size = 80, className }: AvatarProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" className={className}>
      <circle cx="40" cy="40" r="40" fill="#F5F1EB" />
      <g stroke="#2C2C2C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none">
        {/* 脸部轮廓 */}
        <ellipse cx="40" cy="48" rx="12" ry="14" />
        {/* 冠帽 */}
        <path d="M28 38 L40 28 L52 38" />
        <path d="M32 38 L32 32 L48 32 L48 38" />
        <rect x="38" y="24" width="4" height="8" fill="#2C2C2C" />
        {/* 简化五官 */}
        <line x1="35" y1="46" x2="37" y2="46" />
        <line x1="43" y1="46" x2="45" y2="46" />
        <path d="M37 52 Q40 54 43 52" />
      </g>
    </svg>
  )
}

// 2. 女性默认头像：宣纸色底 + 简洁的仕女发髻轮廓（墨色线条）
export function FemaleDefaultAvatar({ size = 80, className }: AvatarProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" className={className}>
      <circle cx="40" cy="40" r="40" fill="#F5F1EB" />
      <g stroke="#2C2C2C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none">
        {/* 脸部轮廓 */}
        <ellipse cx="40" cy="48" rx="11" ry="13" />
        {/* 发髻 */}
        <path d="M29 42 Q26 30 35 26 Q40 24 45 26 Q54 30 51 42" />
        <ellipse cx="40" cy="26" rx="8" ry="5" />
        {/* 发簪 */}
        <line x1="32" y1="24" x2="28" y2="20" stroke="#C9A96E" strokeWidth="2" />
        <circle cx="27" cy="19" r="2" fill="#C9A96E" />
        {/* 简化五官 */}
        <line x1="36" y1="46" x2="38" y2="46" />
        <line x1="42" y1="46" x2="44" y2="46" />
        <path d="M38 52 Q40 53 42 52" />
      </g>
    </svg>
  )
}

// 3. 无性别默认头像：宣纸色底 + 太极图简化线条（金色线条）
export function NeutralDefaultAvatar({ size = 80, className }: AvatarProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" className={className}>
      <circle cx="40" cy="40" r="40" fill="#F5F1EB" />
      <g stroke="#C9A96E" strokeWidth="2" fill="none">
        {/* 太极外圆 */}
        <circle cx="40" cy="40" r="20" />
        {/* 太极阴阳 */}
        <path d="M40 20 A20 20 0 0 1 40 60 A10 10 0 0 1 40 40 A10 10 0 0 0 40 20" fill="#C9A96E" />
        <circle cx="40" cy="30" r="3" fill="#F5F1EB" />
        <circle cx="40" cy="50" r="3" fill="#C9A96E" />
      </g>
    </svg>
  )
}

// 4. 圈主默认头像：宣纸色底 + 书卷简化图标（主色线条）
export function CircleOwnerDefaultAvatar({ size = 80, className }: AvatarProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" className={className}>
      <circle cx="40" cy="40" r="40" fill="#F5F1EB" />
      <g stroke="#C41E3A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none">
        {/* 书卷 */}
        <path d="M25 28 Q22 40 25 52" />
        <path d="M55 28 Q58 40 55 52" />
        <path d="M25 28 L55 28" />
        <path d="M25 52 L55 52" />
        {/* 卷轴头 */}
        <ellipse cx="25" cy="40" rx="3" ry="12" fill="#C41E3A" opacity="0.2" />
        <ellipse cx="55" cy="40" rx="3" ry="12" fill="#C41E3A" opacity="0.2" />
        {/* 文字线条 */}
        <line x1="32" y1="35" x2="48" y2="35" strokeWidth="1" />
        <line x1="32" y1="40" x2="48" y2="40" strokeWidth="1" />
        <line x1="32" y1="45" x2="42" y2="45" strokeWidth="1" />
      </g>
    </svg>
  )
}

// 5. 系统/官方默认头像：金色底 + 主色"热"字印章样式
export function SystemDefaultAvatar({ size = 80, className }: AvatarProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" className={className}>
      <circle cx="40" cy="40" r="40" fill="#C9A96E" />
      {/* 印章方框 */}
      <rect x="22" y="22" width="36" height="36" rx="4" stroke="#C41E3A" strokeWidth="2" fill="none" />
      {/* 简化"热"字 */}
      <g fill="#C41E3A">
        <rect x="30" y="28" width="20" height="2" />
        <rect x="39" y="28" width="2" height="10" />
        <rect x="32" y="36" width="16" height="2" />
        <path d="M32 42 L34 48 L40 44 L46 48 L48 42" strokeWidth="2" stroke="#C41E3A" fill="none" />
        <rect x="36" y="50" width="8" height="2" />
      </g>
    </svg>
  )
}
