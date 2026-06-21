"use client"

// 引导插画组件 - 现代简约 + 东方美学风格
// 配色：故宫红#C41E3A、宣纸米白#F5F1EB、金色#C9A96E、墨色#2C2C2C

interface IllustrationProps {
  size?: number
  className?: string
}

// 1. 新手引导-排盘：罗盘 + 生辰八字卷轴
export function GuidePaipan({ size = 200, className }: IllustrationProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" className={className}>
      {/* 罗盘底座 */}
      <circle cx="100" cy="100" r="70" fill="#F5F1EB" stroke="#C9A96E" strokeWidth="3" />
      <circle cx="100" cy="100" r="60" fill="none" stroke="#2C2C2C" strokeWidth="1" />
      <circle cx="100" cy="100" r="45" fill="none" stroke="#2C2C2C" strokeWidth="1" />
      <circle cx="100" cy="100" r="30" fill="none" stroke="#2C2C2C" strokeWidth="1" />
      {/* 八卦方位 */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
        <g key={i} transform={`rotate(${angle} 100 100)`}>
          <line x1="100" y1="35" x2="100" y2="45" stroke="#2C2C2C" strokeWidth="1" />
          <line x1="100" y1="55" x2="100" y2="60" stroke="#C41E3A" strokeWidth="2" />
        </g>
      ))}
      {/* 太极中心 */}
      <circle cx="100" cy="100" r="15" fill="#F5F1EB" stroke="#2C2C2C" strokeWidth="1" />
      <path d="M100 85 A15 15 0 0 1 100 115 A7.5 7.5 0 0 1 100 100 A7.5 7.5 0 0 0 100 85" fill="#2C2C2C" />
      <circle cx="100" cy="92.5" r="2" fill="#F5F1EB" />
      <circle cx="100" cy="107.5" r="2" fill="#2C2C2C" />
      {/* 指针 */}
      <path d="M100 70 L95 100 L100 95 L105 100 Z" fill="#C41E3A" />
      <path d="M100 130 L95 100 L100 105 L105 100 Z" fill="#2C2C2C" />
      {/* 生辰卷轴（右下角） */}
      <g transform="translate(140, 130)">
        <rect x="0" y="0" width="45" height="55" fill="#F5F1EB" stroke="#C9A96E" strokeWidth="1" rx="2" />
        <ellipse cx="0" cy="27.5" rx="4" ry="27.5" fill="#C9A96E" />
        <text x="10" y="18" fontSize="8" fill="#2C2C2C" fontFamily="serif">庚寅</text>
        <text x="10" y="30" fontSize="8" fill="#2C2C2C" fontFamily="serif">戊子</text>
        <text x="10" y="42" fontSize="8" fill="#2C2C2C" fontFamily="serif">甲午</text>
        <text x="10" y="54" fontSize="8" fill="#2C2C2C" fontFamily="serif">丙申</text>
      </g>
    </svg>
  )
}

// 2. 新手引导-加入圈子：茶席 + 围坐的蒲团
export function GuideJoinCircle({ size = 200, className }: IllustrationProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" className={className}>
      {/* 茶席（圆形桌面） */}
      <ellipse cx="100" cy="100" rx="50" ry="20" fill="#C9A96E" />
      <ellipse cx="100" cy="95" rx="50" ry="20" fill="#F5F1EB" stroke="#C9A96E" strokeWidth="1" />
      {/* 茶具 */}
      <ellipse cx="100" cy="90" rx="12" ry="5" fill="#C9A96E" stroke="#2C2C2C" strokeWidth="0.5" />
      <rect x="94" y="80" width="12" height="10" fill="#F5F1EB" stroke="#2C2C2C" strokeWidth="0.5" rx="1" />
      {/* 茶杯 */}
      {[[75, 92], [125, 92], [90, 88], [110, 88]].map(([cx, cy], i) => (
        <g key={i}>
          <ellipse cx={cx} cy={cy} rx="5" ry="2" fill="#F5F1EB" stroke="#2C2C2C" strokeWidth="0.5" />
        </g>
      ))}
      {/* 蒲团 */}
      {[
        [40, 130], [100, 145], [160, 130], [55, 155], [145, 155]
      ].map(([cx, cy], i) => (
        <g key={i}>
          <ellipse cx={cx} cy={cy} rx="22" ry="10" fill="#C41E3A" opacity="0.15" />
          <ellipse cx={cx} cy={cy - 3} rx="20" ry="8" fill="#C41E3A" opacity="0.3" stroke="#C41E3A" strokeWidth="0.5" />
          {/* 蒲团纹理 */}
          <ellipse cx={cx} cy={cy - 3} rx="12" ry="5" fill="none" stroke="#C41E3A" strokeWidth="0.3" opacity="0.5" />
        </g>
      ))}
      {/* 烟气 */}
      <path d="M98 75 Q95 65 100 55" stroke="#2C2C2C" strokeWidth="0.5" fill="none" opacity="0.3" />
      <path d="M102 75 Q105 68 102 60" stroke="#2C2C2C" strokeWidth="0.5" fill="none" opacity="0.3" />
    </svg>
  )
}

// 3. 新手引导-学习课程：书案 + 展开的竹简
export function GuideLearnCourse({ size = 200, className }: IllustrationProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" className={className}>
      {/* 书案 */}
      <rect x="30" y="120" width="140" height="8" fill="#C9A96E" rx="2" />
      <rect x="40" y="128" width="8" height="50" fill="#C9A96E" />
      <rect x="152" y="128" width="8" height="50" fill="#C9A96E" />
      {/* 竹简展开 */}
      <g transform="translate(45, 55)">
        {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((x, i) => (
          <g key={i}>
            <rect x={x} y="0" width="8" height="60" fill="#C9A96E" opacity="0.7" rx="1" />
            {/* 文字线条 */}
            <line x1={x + 4} y1="8" x2={x + 4} y2="52" stroke="#2C2C2C" strokeWidth="0.5" opacity="0.4" />
          </g>
        ))}
        {/* 绑绳 */}
        <line x1="0" y1="12" x2="108" y2="12" stroke="#C41E3A" strokeWidth="2" />
        <line x1="0" y1="48" x2="108" y2="48" stroke="#C41E3A" strokeWidth="2" />
      </g>
      {/* 毛笔架 */}
      <g transform="translate(155, 85)">
        <rect x="0" y="0" width="25" height="35" fill="none" stroke="#C9A96E" strokeWidth="2" />
        <line x1="0" y1="10" x2="25" y2="10" stroke="#C9A96E" strokeWidth="2" />
        {/* 毛笔 */}
        <rect x="5" y="-15" width="4" height="25" fill="#2C2C2C" rx="1" />
        <path d="M5 10 L7 18 L9 10" fill="#2C2C2C" />
        <rect x="16" y="-10" width="4" height="20" fill="#2C2C2C" rx="1" />
        <path d="M16 10 L18 16 L20 10" fill="#2C2C2C" />
      </g>
      {/* 砚台 */}
      <ellipse cx="60" cy="115" rx="15" ry="6" fill="#2C2C2C" />
      <ellipse cx="60" cy="113" rx="12" ry="4" fill="#2C2C2C" opacity="0.5" />
    </svg>
  )
}

// 4. 引导-发布内容：砚台 + 正在滴墨的毛笔
export function GuidePublish({ size = 200, className }: IllustrationProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" className={className}>
      {/* 宣纸背景 */}
      <rect x="30" y="60" width="120" height="100" fill="#F5F1EB" stroke="#C9A96E" strokeWidth="1" transform="rotate(-5 90 110)" />
      {/* 砚台 */}
      <ellipse cx="130" cy="140" rx="35" ry="15" fill="#2C2C2C" />
      <ellipse cx="130" cy="135" rx="30" ry="12" fill="#2C2C2C" opacity="0.7" />
      <ellipse cx="125" cy="133" rx="15" ry="6" fill="#2C2C2C" opacity="0.3" />
      {/* 墨汁 */}
      <ellipse cx="125" cy="133" rx="10" ry="4" fill="#2C2C2C" />
      {/* 毛笔 */}
      <g transform="translate(95, 30) rotate(25)">
        <rect x="0" y="0" width="8" height="70" fill="#C9A96E" rx="2" />
        <rect x="1" y="0" width="6" height="15" fill="#C41E3A" rx="1" />
        <path d="M0 70 L4 95 L8 70" fill="#2C2C2C" />
        {/* 墨滴 */}
        <ellipse cx="4" cy="100" rx="3" ry="4" fill="#2C2C2C" opacity="0.8" />
      </g>
      {/* 已写文字痕迹 */}
      <g transform="rotate(-5 90 110)" opacity="0.4">
        <line x1="50" y1="85" x2="80" y2="85" stroke="#2C2C2C" strokeWidth="1" />
        <line x1="50" y1="95" x2="90" y2="95" stroke="#2C2C2C" strokeWidth="1" />
        <line x1="50" y1="105" x2="75" y2="105" stroke="#2C2C2C" strokeWidth="1" />
      </g>
    </svg>
  )
}

// 5. 引导-开通会员：打开的古籍 + 金色书签
export function GuideVip({ size = 200, className }: IllustrationProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" className={className}>
      {/* 打开的古籍 */}
      <g transform="translate(25, 50)">
        {/* 左页 */}
        <path d="M75 0 L0 15 L0 120 L75 105 Z" fill="#F5F1EB" stroke="#C9A96E" strokeWidth="1" />
        {/* 右页 */}
        <path d="M75 0 L150 15 L150 120 L75 105 Z" fill="#F5F1EB" stroke="#C9A96E" strokeWidth="1" />
        {/* 书脊 */}
        <line x1="75" y1="0" x2="75" y2="105" stroke="#C9A96E" strokeWidth="2" />
        {/* 左页文字 */}
        <g opacity="0.5">
          <line x1="15" y1="35" x2="60" y2="30" stroke="#2C2C2C" strokeWidth="0.5" />
          <line x1="15" y1="50" x2="60" y2="45" stroke="#2C2C2C" strokeWidth="0.5" />
          <line x1="15" y1="65" x2="55" y2="60" stroke="#2C2C2C" strokeWidth="0.5" />
          <line x1="15" y1="80" x2="60" y2="75" stroke="#2C2C2C" strokeWidth="0.5" />
        </g>
        {/* 右页文字 */}
        <g opacity="0.5">
          <line x1="90" y1="30" x2="135" y2="35" stroke="#2C2C2C" strokeWidth="0.5" />
          <line x1="90" y1="45" x2="135" y2="50" stroke="#2C2C2C" strokeWidth="0.5" />
          <line x1="90" y1="60" x2="130" y2="65" stroke="#2C2C2C" strokeWidth="0.5" />
          <line x1="90" y1="75" x2="135" y2="80" stroke="#2C2C2C" strokeWidth="0.5" />
        </g>
      </g>
      {/* 金色书签 */}
      <g transform="translate(130, 35)">
        <path d="M0 0 L20 0 L20 70 L10 60 L0 70 Z" fill="#C9A96E" />
        <path d="M0 0 L20 0 L20 70 L10 60 L0 70 Z" fill="url(#goldGradient)" />
        {/* VIP 文字 */}
        <text x="3" y="25" fontSize="8" fill="#C41E3A" fontWeight="bold">VIP</text>
        {/* 装饰 */}
        <circle cx="10" cy="40" r="5" fill="none" stroke="#C41E3A" strokeWidth="1" />
        <path d="M7 40 L10 43 L14 37" stroke="#C41E3A" strokeWidth="1.5" fill="none" />
      </g>
      {/* 光芒效果 */}
      <g stroke="#C9A96E" strokeWidth="1" opacity="0.5">
        <line x1="150" y1="25" x2="160" y2="15" />
        <line x1="155" y1="35" x2="170" y2="30" />
        <line x1="155" y1="50" x2="168" y2="55" />
      </g>
      <defs>
        <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#C9A96E" />
          <stop offset="50%" stopColor="#E8D5A3" />
          <stop offset="100%" stopColor="#C9A96E" />
        </linearGradient>
      </defs>
    </svg>
  )
}
