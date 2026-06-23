"use client"

// 空状态插画组件 - 现代简约 + 东方美学风格
// 配色：故宫红#C41E3A、宣纸米白#F5F1EB、金色#C9A96E、墨色#2C2C2C

interface IllustrationProps {
  size?: number
  className?: string
}

// 1. 通用空状态：展开的空白卷轴 + 一支毛笔，意境"等待书写"
export function EmptyGeneral({ size = 160, className }: IllustrationProps) {
  const scale = size / 160
  return (
    <svg width={size} height={size} viewBox="0 0 160 160" fill="none" className={className}>
      <g transform={`scale(${scale})`}>
        {/* 卷轴 */}
        <rect x="30" y="50" width="100" height="70" fill="#F5F1EB" stroke="#2C2C2C" strokeWidth="1" />
        <ellipse cx="30" cy="85" rx="6" ry="35" fill="#C9A96E" />
        <ellipse cx="130" cy="85" rx="6" ry="35" fill="#C9A96E" />
        <ellipse cx="30" cy="85" rx="3" ry="32" fill="#F5F1EB" />
        <ellipse cx="130" cy="85" rx="3" ry="32" fill="#F5F1EB" />
        {/* 毛笔 */}
        <g transform="translate(110, 30) rotate(30)">
          <rect x="0" y="0" width="6" height="35" fill="#2C2C2C" rx="1" />
          <path d="M0 35 L3 50 L6 35" fill="#2C2C2C" />
          <rect x="0" y="0" width="6" height="8" fill="#C41E3A" rx="1" />
        </g>
        {/* 墨点装饰 */}
        <circle cx="95" cy="75" r="2" fill="#2C2C2C" opacity="0.3" />
        <circle cx="100" cy="80" r="1.5" fill="#2C2C2C" opacity="0.2" />
      </g>
    </svg>
  )
}

// 2. 无内容空状态：空书架 + 一本翻开的书
export function EmptyContent({ size = 160, className }: IllustrationProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 160 160" fill="none" className={className}>
      {/* 书架 */}
      <rect x="30" y="110" width="100" height="6" fill="#C9A96E" />
      <rect x="28" y="40" width="4" height="76" fill="#C9A96E" />
      <rect x="128" y="40" width="4" height="76" fill="#C9A96E" />
      <rect x="30" y="38" width="100" height="4" fill="#C9A96E" />
      {/* 翻开的书 */}
      <g transform="translate(55, 65)">
        <path d="M25 0 L0 10 L0 40 L25 30 L50 40 L50 10 Z" fill="#F5F1EB" stroke="#2C2C2C" strokeWidth="1" />
        <line x1="25" y1="0" x2="25" y2="30" stroke="#2C2C2C" strokeWidth="1" />
        {/* 书页线条 */}
        <line x1="5" y1="15" x2="20" y2="12" stroke="#2C2C2C" strokeWidth="0.5" opacity="0.5" />
        <line x1="5" y1="20" x2="20" y2="17" stroke="#2C2C2C" strokeWidth="0.5" opacity="0.5" />
        <line x1="30" y1="12" x2="45" y2="15" stroke="#2C2C2C" strokeWidth="0.5" opacity="0.5" />
        <line x1="30" y1="17" x2="45" y2="20" stroke="#2C2C2C" strokeWidth="0.5" opacity="0.5" />
      </g>
      {/* 装饰 */}
      <circle cx="45" cy="90" r="3" fill="#C41E3A" opacity="0.2" />
      <circle cx="115" cy="85" r="2" fill="#C41E3A" opacity="0.2" />
    </svg>
  )
}

// 3. 无网络空状态：山水画中的亭子 + 飘落的树叶
export function EmptyNetwork({ size = 160, className }: IllustrationProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 160 160" fill="none" className={className}>
      {/* 远山 */}
      <path d="M0 120 Q40 70 80 100 Q120 60 160 90 L160 160 L0 160 Z" fill="#F5F1EB" />
      <path d="M0 130 Q50 90 100 110 Q140 80 160 100 L160 160 L0 160 Z" fill="#2C2C2C" opacity="0.1" />
      {/* 亭子 */}
      <g transform="translate(55, 75)">
        {/* 亭顶 */}
        <path d="M25 0 L0 20 L50 20 Z" fill="#C41E3A" opacity="0.8" />
        <path d="M25 0 L25 20" stroke="#2C2C2C" strokeWidth="1" />
        {/* 亭柱 */}
        <rect x="10" y="20" width="3" height="30" fill="#C9A96E" />
        <rect x="37" y="20" width="3" height="30" fill="#C9A96E" />
        {/* 亭台 */}
        <rect x="5" y="48" width="40" height="4" fill="#C9A96E" />
      </g>
      {/* 飘落的树叶 */}
      <g fill="#C9A96E" opacity="0.6">
        <ellipse cx="30" cy="50" rx="4" ry="2" transform="rotate(-30 30 50)" />
        <ellipse cx="130" cy="40" rx="3" ry="1.5" transform="rotate(20 130 40)" />
        <ellipse cx="45" cy="70" rx="3" ry="1.5" transform="rotate(-45 45 70)" />
        <ellipse cx="120" cy="65" rx="4" ry="2" transform="rotate(15 120 65)" />
      </g>
      {/* 云雾 */}
      <ellipse cx="30" cy="100" rx="20" ry="5" fill="#F5F1EB" opacity="0.8" />
      <ellipse cx="130" cy="95" rx="25" ry="6" fill="#F5F1EB" opacity="0.8" />
    </svg>
  )
}

// 4. 无消息空状态：飞鹤传书 + 云纹
export function EmptyMessages({ size = 160, className }: IllustrationProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 160 160" fill="none" className={className}>
      {/* 云纹 */}
      <g fill="#F5F1EB" stroke="#C9A96E" strokeWidth="0.5">
        <ellipse cx="40" cy="120" rx="25" ry="10" />
        <ellipse cx="55" cy="115" rx="15" ry="8" />
        <ellipse cx="120" cy="125" rx="30" ry="12" />
        <ellipse cx="100" cy="118" rx="18" ry="8" />
      </g>
      {/* 飞鹤 */}
      <g transform="translate(50, 40)" stroke="#2C2C2C" strokeWidth="1.5" fill="none">
        {/* 身体 */}
        <ellipse cx="30" cy="30" rx="15" ry="8" fill="#F5F1EB" />
        {/* 翅膀 */}
        <path d="M15 30 Q0 15 20 20 Q30 22 30 30" />
        <path d="M45 30 Q60 15 40 20 Q30 22 30 30" />
        {/* 头和颈 */}
        <path d="M45 30 Q55 28 58 22" />
        <circle cx="60" cy="20" r="5" fill="#F5F1EB" />
        <circle cx="62" cy="18" r="1" fill="#2C2C2C" />
        {/* 红冠 */}
        <circle cx="60" cy="15" r="2" fill="#C41E3A" />
        {/* 尾羽 */}
        <path d="M15 30 Q5 35 8 45" />
        <path d="M15 32 Q8 38 12 48" />
      </g>
      {/* 书信 */}
      <g transform="translate(65, 75)">
        <rect x="0" y="0" width="30" height="20" fill="#F5F1EB" stroke="#C9A96E" strokeWidth="1" rx="1" />
        <path d="M0 0 L15 10 L30 0" stroke="#C9A96E" strokeWidth="1" fill="none" />
        <circle cx="15" cy="12" r="4" fill="#C41E3A" opacity="0.3" />
      </g>
    </svg>
  )
}

// 5. 搜索无结果：放大镜 + 竹简
export function EmptySearch({ size = 160, className }: IllustrationProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 160 160" fill="none" className={className}>
      {/* 竹简 */}
      <g transform="translate(30, 50)">
        {[0, 12, 24, 36, 48, 60, 72, 84].map((x, i) => (
          <g key={i}>
            <rect x={x} y="0" width="10" height="60" fill="#C9A96E" opacity="0.6" rx="1" />
            <line x1={x + 5} y1="5" x2={x + 5} y2="55" stroke="#2C2C2C" strokeWidth="0.5" opacity="0.3" />
          </g>
        ))}
        {/* 绳结 */}
        <line x1="0" y1="10" x2="94" y2="10" stroke="#C41E3A" strokeWidth="2" />
        <line x1="0" y1="50" x2="94" y2="50" stroke="#C41E3A" strokeWidth="2" />
      </g>
      {/* 放大镜 */}
      <g transform="translate(90, 30)">
        <circle cx="25" cy="25" r="20" fill="none" stroke="#2C2C2C" strokeWidth="3" />
        <circle cx="25" cy="25" r="15" fill="#F5F1EB" opacity="0.5" />
        <line x1="40" y1="40" x2="55" y2="55" stroke="#2C2C2C" strokeWidth="4" strokeLinecap="round" />
        {/* 问号 */}
        <text x="20" y="32" fontSize="20" fill="#2C2C2C" opacity="0.5" fontFamily="serif">?</text>
      </g>
    </svg>
  )
}

// 6. 支付成功：绽放的梅花 + 如意
export function EmptyPaymentSuccess({ size = 160, className }: IllustrationProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 160 160" fill="none" className={className}>
      {/* 梅花枝 */}
      <path d="M20 140 Q50 100 80 80 Q100 70 120 75" stroke="#2C2C2C" strokeWidth="2" fill="none" />
      <path d="M80 80 Q70 60 75 40" stroke="#2C2C2C" strokeWidth="1.5" fill="none" />
      <path d="M95 75 Q110 55 105 35" stroke="#2C2C2C" strokeWidth="1.5" fill="none" />
      {/* 梅花 */}
      {[[75, 38], [105, 33], [120, 72], [65, 65], [90, 55]].map(([cx, cy], i) => (
        <g key={i} transform={`translate(${cx}, ${cy})`}>
          {[0, 72, 144, 216, 288].map((angle, j) => (
            <ellipse 
              key={j} 
              cx="0" 
              cy="-6" 
              rx="4" 
              ry="6" 
              fill="#C41E3A" 
              opacity="0.8"
              transform={`rotate(${angle})`} 
            />
          ))}
          <circle cx="0" cy="0" r="3" fill="#C9A96E" />
        </g>
      ))}
      {/* 如意 */}
      <g transform="translate(35, 95)">
        <path d="M0 20 Q10 0 30 5 Q50 10 45 25 Q40 35 25 30 Q15 28 10 35 L5 30 Q8 22 0 20" 
              fill="#C9A96E" stroke="#2C2C2C" strokeWidth="0.5" />
        <rect x="25" y="30" width="4" height="30" fill="#C9A96E" rx="2" />
      </g>
    </svg>
  )
}

// 7. 支付失败：细雨中的油纸伞
export function EmptyPaymentFailed({ size = 160, className }: IllustrationProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 160 160" fill="none" className={className}>
      {/* 雨丝 */}
      <g stroke="#2C2C2C" strokeWidth="0.5" opacity="0.3">
        {[20, 35, 50, 65, 95, 110, 125, 140].map((x, i) => (
          <line key={i} x1={x} y1={10 + (i % 3) * 5} x2={x - 5} y2={30 + (i % 3) * 5} />
        ))}
        {[25, 40, 55, 100, 115, 130].map((x, i) => (
          <line key={i} x1={x} y1={40 + (i % 2) * 10} x2={x - 5} y2={60 + (i % 2) * 10} />
        ))}
      </g>
      {/* 油纸伞 */}
      <g transform="translate(40, 45)">
        {/* 伞面 */}
        <path d="M0 40 Q40 -10 80 40" fill="#C41E3A" opacity="0.8" />
        <path d="M0 40 Q40 0 80 40" fill="none" stroke="#2C2C2C" strokeWidth="1" />
        {/* 伞骨 */}
        {[0, 20, 40, 60, 80].map((x, i) => (
          <line key={i} x1={x} y1="40" x2="40" y2="15" stroke="#C9A96E" strokeWidth="1" />
        ))}
        {/* 伞柄 */}
        <line x1="40" y1="15" x2="40" y2="80" stroke="#C9A96E" strokeWidth="3" />
        <path d="M40 80 Q35 90 40 95 Q45 90 40 80" fill="#C9A96E" />
      </g>
      {/* 水波纹 */}
      <ellipse cx="80" cy="140" rx="50" ry="8" fill="none" stroke="#2C2C2C" strokeWidth="0.5" opacity="0.3" />
      <ellipse cx="80" cy="140" rx="35" ry="5" fill="none" stroke="#2C2C2C" strokeWidth="0.5" opacity="0.2" />
    </svg>
  )
}

// 8. 404错误：迷雾中的石径小路
export function Empty404({ size = 160, className }: IllustrationProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 160 160" fill="none" className={className}>
      {/* 远山迷雾 */}
      <ellipse cx="80" cy="50" rx="70" ry="20" fill="#2C2C2C" opacity="0.1" />
      <ellipse cx="60" cy="60" rx="50" ry="15" fill="#2C2C2C" opacity="0.08" />
      <ellipse cx="100" cy="55" rx="45" ry="12" fill="#2C2C2C" opacity="0.06" />
      {/* 石径 */}
      <path d="M80 160 Q75 140 70 120 Q65 100 60 80 Q55 60 50 40" 
            fill="none" stroke="#C9A96E" strokeWidth="20" strokeLinecap="round" opacity="0.3" />
      {/* 石块 */}
      {[[75, 145], [70, 125], [65, 105], [60, 85], [55, 65], [52, 48]].map(([cx, cy], i) => (
        <ellipse key={i} cx={cx} cy={cy} rx={8 - i * 0.8} ry={4 - i * 0.3} 
                 fill="#C9A96E" opacity={0.6 - i * 0.05} />
      ))}
      {/* 问号路标 */}
      <g transform="translate(100, 70)">
        <rect x="0" y="0" width="6" height="40" fill="#C9A96E" />
        <rect x="-8" y="-5" width="22" height="18" fill="#F5F1EB" stroke="#2C2C2C" strokeWidth="1" rx="2" />
        <text x="3" y="9" fontSize="14" fill="#C41E3A" fontFamily="serif" fontWeight="bold">?</text>
      </g>
      {/* 云雾遮挡 */}
      <ellipse cx="40" cy="70" rx="30" ry="8" fill="#F5F1EB" opacity="0.9" />
      <ellipse cx="120" cy="65" rx="25" ry="6" fill="#F5F1EB" opacity="0.9" />
    </svg>
  )
}
