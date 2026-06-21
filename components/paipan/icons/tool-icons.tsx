// 排盘工具图标 - 专业易经风格
import React from "react"

// 图标组件映射
const iconComponents: Record<string, () => React.JSX.Element> = {
  // 八字排盘 - 四柱结构
  "bazi": () => (
    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
      <rect x="6" y="10" width="8" height="28" rx="1.5" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.12"/>
      <rect x="16" y="10" width="8" height="28" rx="1.5" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.12"/>
      <rect x="26" y="10" width="8" height="28" rx="1.5" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.12"/>
      <rect x="36" y="10" width="8" height="28" rx="1.5" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.12"/>
      <line x1="6" y1="24" x2="14" y2="24" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.6"/>
      <line x1="16" y1="24" x2="24" y2="24" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.6"/>
      <line x1="26" y1="24" x2="34" y2="24" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.6"/>
      <line x1="36" y1="24" x2="44" y2="24" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.6"/>
    </svg>
  ),

  // 八字解析
  "bazi-analysis": () => (
    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
      <rect x="8" y="8" width="32" height="32" rx="3" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.08"/>
      <line x1="8" y1="18" x2="40" y2="18" stroke="currentColor" strokeWidth="1.5"/>
      <line x1="8" y1="28" x2="40" y2="28" stroke="currentColor" strokeWidth="1.5"/>
      <line x1="18" y1="8" x2="18" y2="40" stroke="currentColor" strokeWidth="1.5"/>
      <line x1="28" y1="8" x2="28" y2="40" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="24" cy="24" r="5" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  ),

  // 奇门遁甲 - 九宫格
  "qimen": () => (
    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
      <rect x="6" y="6" width="10" height="10" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.06"/>
      <rect x="19" y="6" width="10" height="10" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.12"/>
      <rect x="32" y="6" width="10" height="10" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.06"/>
      <rect x="6" y="19" width="10" height="10" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.12"/>
      <rect x="19" y="19" width="10" height="10" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.2"/>
      <rect x="32" y="19" width="10" height="10" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.12"/>
      <rect x="6" y="32" width="10" height="10" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.06"/>
      <rect x="19" y="32" width="10" height="10" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.12"/>
      <rect x="32" y="32" width="10" height="10" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.06"/>
    </svg>
  ),

  // 阴盘奇门 - 太极图
  "yinqimen": () => (
    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
      <circle cx="24" cy="24" r="17" stroke="currentColor" strokeWidth="2"/>
      <path d="M24 7 A8.5 8.5 0 0 1 24 24 A8.5 8.5 0 0 0 24 41 A17 17 0 0 1 24 7" fill="currentColor" fillOpacity="0.6"/>
      <circle cx="24" cy="15.5" r="3" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1"/>
      <circle cx="24" cy="32.5" r="3" fill="currentColor"/>
    </svg>
  ),

  // 六爻排盘 - 六条爻线
  "liuyao": () => (
    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
      <line x1="10" y1="8" x2="38" y2="8" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round"/>
      <line x1="10" y1="15" x2="21" y2="15" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round"/>
      <line x1="27" y1="15" x2="38" y2="15" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round"/>
      <line x1="10" y1="22" x2="38" y2="22" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round"/>
      <line x1="10" y1="29" x2="21" y2="29" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round"/>
      <line x1="27" y1="29" x2="38" y2="29" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round"/>
      <line x1="10" y1="36" x2="38" y2="36" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round"/>
      <line x1="10" y1="43" x2="21" y2="43" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round"/>
      <line x1="27" y1="43" x2="38" y2="43" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round"/>
    </svg>
  ),

  // 梅花易数 - 五瓣梅花
  "meihua": () => (
    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
      <circle cx="24" cy="11" r="7" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.15"/>
      <circle cx="13" cy="20" r="7" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.15"/>
      <circle cx="35" cy="20" r="7" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.15"/>
      <circle cx="16" cy="34" r="7" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.15"/>
      <circle cx="32" cy="34" r="7" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.15"/>
      <circle cx="24" cy="24" r="5" fill="currentColor" fillOpacity="0.4"/>
    </svg>
  ),

  // 阳盘命理
  "yangming": () => (
    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
      <circle cx="24" cy="24" r="12" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.15"/>
      <line x1="24" y1="4" x2="24" y2="10" stroke="currentColor" strokeWidth="2"/>
      <line x1="24" y1="38" x2="24" y2="44" stroke="currentColor" strokeWidth="2"/>
      <line x1="4" y1="24" x2="10" y2="24" stroke="currentColor" strokeWidth="2"/>
      <line x1="38" y1="24" x2="44" y2="24" stroke="currentColor" strokeWidth="2"/>
      <line x1="10" y1="10" x2="14" y2="14" stroke="currentColor" strokeWidth="2"/>
      <line x1="34" y1="34" x2="38" y2="38" stroke="currentColor" strokeWidth="2"/>
      <line x1="10" y1="38" x2="14" y2="34" stroke="currentColor" strokeWidth="2"/>
      <line x1="34" y1="14" x2="38" y2="10" stroke="currentColor" strokeWidth="2"/>
    </svg>
  ),

  // 命理奇门
  "mingli-qimen": () => (
    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
      <rect x="8" y="8" width="32" height="32" rx="2" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.03"/>
      <line x1="8" y1="18.7" x2="40" y2="18.7" stroke="currentColor" strokeWidth="1" strokeOpacity="0.6"/>
      <line x1="8" y1="29.3" x2="40" y2="29.3" stroke="currentColor" strokeWidth="1" strokeOpacity="0.6"/>
      <line x1="18.7" y1="8" x2="18.7" y2="40" stroke="currentColor" strokeWidth="1" strokeOpacity="0.6"/>
      <line x1="29.3" y1="8" x2="29.3" y2="40" stroke="currentColor" strokeWidth="1" strokeOpacity="0.6"/>
      <circle cx="24" cy="24" r="6" fill="currentColor" fillOpacity="0.15"/>
    </svg>
  ),

  // 紫微斗数 - 十二宫
  "ziwei": () => (
    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
      <rect x="6" y="6" width="36" height="36" stroke="currentColor" strokeWidth="1.5"/>
      <line x1="6" y1="15" x2="42" y2="15" stroke="currentColor" strokeWidth="1"/>
      <line x1="6" y1="33" x2="42" y2="33" stroke="currentColor" strokeWidth="1"/>
      <line x1="15" y1="6" x2="15" y2="42" stroke="currentColor" strokeWidth="1"/>
      <line x1="33" y1="6" x2="33" y2="42" stroke="currentColor" strokeWidth="1"/>
      <rect x="15" y="15" width="18" height="18" fill="currentColor" fillOpacity="0.08"/>
    </svg>
  ),

  // 大六壬
  "daliuren": () => (
    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
      <circle cx="24" cy="24" r="18" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="24" cy="24" r="11" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.08"/>
      <line x1="24" y1="6" x2="24" y2="13" stroke="currentColor" strokeWidth="1"/>
      <line x1="24" y1="35" x2="24" y2="42" stroke="currentColor" strokeWidth="1"/>
      <line x1="6" y1="24" x2="13" y2="24" stroke="currentColor" strokeWidth="1"/>
      <line x1="35" y1="24" x2="42" y2="24" stroke="currentColor" strokeWidth="1"/>
    </svg>
  ),

  // 小六壬
  "xiaoliuren": () => (
    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
      <circle cx="14" cy="12" r="7" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.05"/>
      <circle cx="34" cy="12" r="7" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.08"/>
      <circle cx="14" cy="26" r="7" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.08"/>
      <circle cx="34" cy="26" r="7" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.12"/>
      <circle cx="14" cy="40" r="7" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.12"/>
      <circle cx="34" cy="40" r="7" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.15"/>
    </svg>
  ),

  // 金口诀
  "jinkoujue": () => (
    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
      <rect x="8" y="8" width="32" height="32" rx="4" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.05"/>
      <text x="24" y="30" textAnchor="middle" fontSize="16" fontWeight="700" fill="currentColor">诀</text>
    </svg>
  ),

  // 起名工具
  "naming": () => (
    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
      <path d="M34 6 L42 14 L20 36 L10 40 L14 30 Z" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.08"/>
      <line x1="30" y1="10" x2="38" y2="18" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  ),

  // 姓名解析
  "name-analysis": () => (
    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
      <rect x="8" y="6" width="32" height="36" rx="3" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.05"/>
      <line x1="14" y1="14" x2="34" y2="14" stroke="currentColor" strokeWidth="1"/>
      <line x1="14" y1="22" x2="34" y2="22" stroke="currentColor" strokeWidth="1"/>
      <line x1="14" y1="30" x2="28" y2="30" stroke="currentColor" strokeWidth="1"/>
    </svg>
  ),

  // 手机号分析
  "phone-analysis": () => (
    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
      <rect x="13" y="4" width="22" height="40" rx="4" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.05"/>
      <line x1="13" y1="12" x2="35" y2="12" stroke="currentColor" strokeWidth="1"/>
      <line x1="13" y1="36" x2="35" y2="36" stroke="currentColor" strokeWidth="1"/>
      <circle cx="24" cy="40" r="2" stroke="currentColor" strokeWidth="1"/>
    </svg>
  ),

  // 诸葛神数
  "zhuge": () => (
    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
      <path d="M24 6 C14 12 10 22 12 34 L24 28 L36 34 C38 22 34 12 24 6 Z" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.1"/>
      <line x1="24" y1="6" x2="24" y2="28" stroke="currentColor" strokeWidth="1.5"/>
      <ellipse cx="24" cy="24" rx="6" ry="3" fill="currentColor" fillOpacity="0.15"/>
    </svg>
  ),

  // 电子罗盘
  "compass": () => (
    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
      <circle cx="24" cy="24" r="18" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="24" cy="24" r="12" stroke="currentColor" strokeWidth="1" strokeOpacity="0.5"/>
      <polygon points="24,8 26.5,22 24,24 21.5,22" fill="currentColor"/>
      <polygon points="24,40 21.5,26 24,24 26.5,26" fill="currentColor" fillOpacity="0.3"/>
      <circle cx="24" cy="24" r="2" fill="currentColor"/>
    </svg>
  ),

  // 立极尺
  "ruler": () => (
    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
      <circle cx="24" cy="24" r="18" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="24" cy="24" r="13" stroke="currentColor" strokeWidth="1" strokeOpacity="0.6"/>
      <circle cx="24" cy="24" r="8" stroke="currentColor" strokeWidth="1" strokeOpacity="0.6"/>
      <circle cx="24" cy="24" r="3" fill="currentColor"/>
      <line x1="24" y1="6" x2="24" y2="11" stroke="currentColor" strokeWidth="1"/>
      <line x1="24" y1="37" x2="24" y2="42" stroke="currentColor" strokeWidth="1"/>
      <line x1="6" y1="24" x2="11" y2="24" stroke="currentColor" strokeWidth="1"/>
      <line x1="37" y1="24" x2="42" y2="24" stroke="currentColor" strokeWidth="1"/>
    </svg>
  ),

  // 山向地图
  "direction-map": () => (
    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
      <path d="M6 38 L16 22 L26 32 L38 14 L42 38 Z" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.1"/>
      <circle cx="38" cy="14" r="5" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.15"/>
      <circle cx="38" cy="14" r="2" fill="currentColor"/>
    </svg>
  ),

  // 玄空飞星
  "flying-star": () => (
    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
      <rect x="8" y="8" width="32" height="32" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.03"/>
      <line x1="8" y1="18.7" x2="40" y2="18.7" stroke="currentColor" strokeWidth="1"/>
      <line x1="8" y1="29.3" x2="40" y2="29.3" stroke="currentColor" strokeWidth="1"/>
      <line x1="18.7" y1="8" x2="18.7" y2="40" stroke="currentColor" strokeWidth="1"/>
      <line x1="29.3" y1="8" x2="29.3" y2="40" stroke="currentColor" strokeWidth="1"/>
      <path d="M24 14 L25.5 19 L31 19 L26.5 22.5 L28 28 L24 25 L20 28 L21.5 22.5 L17 19 L22.5 19 Z" fill="currentColor"/>
    </svg>
  ),

  // 孔明神卦
  "kongming": () => (
    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
      <path d="M24 4 L28 17 L42 17 L31 26 L35 40 L24 31 L13 40 L17 26 L6 17 L20 17 Z" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.1"/>
      <circle cx="24" cy="22" r="4" fill="currentColor" fillOpacity="0.2"/>
    </svg>
  ),

  // ��宅排盘
  "bazhai": () => (
    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
      <path d="M24 4 L44 20 L44 44 L4 44 L4 20 Z" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.05"/>
      <rect x="18" y="28" width="12" height="16" stroke="currentColor" strokeWidth="1.5"/>
      <line x1="4" y1="20" x2="44" y2="20" stroke="currentColor" strokeWidth="1"/>
    </svg>
  ),

  // 飞宫小奇门
  "feigong": () => (
    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
      <rect x="10" y="10" width="28" height="28" rx="2" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.03"/>
      <line x1="10" y1="19.3" x2="38" y2="19.3" stroke="currentColor" strokeWidth="1"/>
      <line x1="10" y1="28.7" x2="38" y2="28.7" stroke="currentColor" strokeWidth="1"/>
      <line x1="19.3" y1="10" x2="19.3" y2="38" stroke="currentColor" strokeWidth="1"/>
      <line x1="28.7" y1="10" x2="28.7" y2="38" stroke="currentColor" strokeWidth="1"/>
      <path d="M14.6 14.6 L24 24 M24 14.6 L33.4 24 M14.6 24 L24 33.4 M24 24 L33.4 33.4" stroke="currentColor" strokeWidth="1" strokeOpacity="0.4" strokeDasharray="2 2"/>
    </svg>
  ),

  // 太乙神数
  "taiyi": () => (
    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
      <circle cx="24" cy="24" r="16" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.03"/>
      <circle cx="24" cy="24" r="8" stroke="currentColor" strokeWidth="1" strokeOpacity="0.5"/>
      <circle cx="24" cy="24" r="3" fill="currentColor"/>
      <circle cx="24" cy="8" r="2.5" fill="currentColor" fillOpacity="0.4"/>
      <circle cx="38" cy="18" r="2" fill="currentColor" fillOpacity="0.3"/>
      <circle cx="38" cy="30" r="2" fill="currentColor" fillOpacity="0.3"/>
      <circle cx="10" cy="18" r="2" fill="currentColor" fillOpacity="0.3"/>
      <circle cx="10" cy="30" r="2" fill="currentColor" fillOpacity="0.3"/>
      <circle cx="24" cy="40" r="2.5" fill="currentColor" fillOpacity="0.4"/>
    </svg>
  ),

  // 小成图
  "xiaocheng": () => (
    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
      <rect x="8" y="8" width="32" height="32" rx="2" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.03"/>
      <line x1="24" y1="8" x2="24" y2="40" stroke="currentColor" strokeWidth="1.5"/>
      <line x1="8" y1="24" x2="40" y2="24" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  ),

  // 万年历
  "calendar": () => (
    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
      <rect x="6" y="10" width="36" height="32" rx="3" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.05"/>
      <line x1="6" y1="18" x2="42" y2="18" stroke="currentColor" strokeWidth="1.5"/>
      <rect x="12" y="6" width="4" height="8" rx="1" fill="currentColor" fillOpacity="0.3"/>
      <rect x="32" y="6" width="4" height="8" rx="1" fill="currentColor" fillOpacity="0.3"/>
      <text x="24" y="34" textAnchor="middle" fontSize="14" fontWeight="700" fill="currentColor">15</text>
    </svg>
  ),

  // 金钱课
  "jinqianke": () => (
    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
      <circle cx="24" cy="24" r="16" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.08"/>
      <circle cx="24" cy="24" r="10" stroke="currentColor" strokeWidth="1.5"/>
      <rect x="20" y="20" width="8" height="8" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  ),

  // 奇门穿壬
  "qimen-chuanren": () => (
    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
      <rect x="8" y="8" width="14" height="14" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.05"/>
      <rect x="26" y="8" width="14" height="14" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.05"/>
      <rect x="8" y="26" width="14" height="14" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.05"/>
      <rect x="26" y="26" width="14" height="14" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.05"/>
      <circle cx="24" cy="24" r="8" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.1"/>
    </svg>
  ),

  // 山向奇门
  "shanxiang-qimen": () => (
    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
      <path d="M8 40 L24 12 L40 40 Z" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.1"/>
      <rect x="16" y="18" width="16" height="16" stroke="currentColor" strokeWidth="1" strokeOpacity="0.6"/>
      <line x1="24" y1="18" x2="24" y2="34" stroke="currentColor" strokeWidth="1" strokeOpacity="0.6"/>
      <line x1="16" y1="26" x2="32" y2="26" stroke="currentColor" strokeWidth="1" strokeOpacity="0.6"/>
    </svg>
  ),

  // 节气查询
  "solar-terms": () => (
    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
      <circle cx="24" cy="24" r="16" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="24" cy="24" r="3" fill="currentColor"/>
      <line x1="24" y1="8" x2="24" y2="14" stroke="currentColor" strokeWidth="2"/>
      <line x1="24" y1="34" x2="24" y2="40" stroke="currentColor" strokeWidth="2"/>
      <line x1="8" y1="24" x2="14" y2="24" stroke="currentColor" strokeWidth="2"/>
      <line x1="34" y1="24" x2="40" y2="24" stroke="currentColor" strokeWidth="2"/>
      <circle cx="24" cy="8" r="2" fill="currentColor" fillOpacity="0.5"/>
    </svg>
  ),

  // 字典查询
  "dictionary": () => (
    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
      <rect x="8" y="4" width="32" height="40" rx="2" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.05"/>
      <rect x="8" y="4" width="8" height="40" fill="currentColor" fillOpacity="0.1"/>
      <line x1="20" y1="14" x2="34" y2="14" stroke="currentColor" strokeWidth="1"/>
      <line x1="20" y1="22" x2="34" y2="22" stroke="currentColor" strokeWidth="1"/>
      <line x1="20" y1="30" x2="30" y2="30" stroke="currentColor" strokeWidth="1"/>
    </svg>
  ),

  // 汉字筛选
  "char-filter": () => (
    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
      <rect x="8" y="8" width="32" height="32" rx="3" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.05"/>
      <text x="24" y="30" textAnchor="middle" fontSize="18" fontWeight="600" fill="currentColor">字</text>
      <circle cx="36" cy="12" r="6" stroke="currentColor" strokeWidth="1.5" fill="white"/>
      <path d="M34 12 L36 14 L40 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),

  // 合伙人
  "partner": () => (
    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
      <circle cx="16" cy="16" r="8" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.08"/>
      <circle cx="32" cy="16" r="8" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.08"/>
      <path d="M4 44 C4 34 9 28 16 28 C20 28 23 30 24 32 C25 30 28 28 32 28 C39 28 44 34 44 44" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.05"/>
    </svg>
  ),

  // 小程序开发
  "mini-program": () => (
    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
      <rect x="8" y="8" width="32" height="32" rx="8" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.05"/>
      <circle cx="20" cy="20" r="5" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.1"/>
      <circle cx="28" cy="28" r="5" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.1"/>
      <path d="M23 17 L31 25" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  ),

  // 会员服务
  "vip-service": () => (
    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
      <path d="M8 18 L16 30 L24 10 L32 30 L40 18 L36 38 L12 38 Z" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.1"/>
      <circle cx="24" cy="20" r="4" fill="currentColor" fillOpacity="0.3"/>
    </svg>
  ),

  // 在线客服
  "customer-service": () => (
    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
      <path d="M12 24 C12 16 17 10 24 10 C31 10 36 16 36 24" stroke="currentColor" strokeWidth="1.5"/>
      <rect x="8" y="22" width="6" height="12" rx="2" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.5"/>
      <rect x="34" y="22" width="6" height="12" rx="2" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M36 34 C36 38 30 42 24 42" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="24" cy="42" r="3" fill="currentColor" fillOpacity="0.3"/>
    </svg>
  ),
}

// 获取工具图标
export function getToolIcon(iconId: string): React.ReactNode {
  const IconComponent = iconComponents[iconId]
  if (IconComponent) {
    return <IconComponent />
  }
  // 默认图标 - 八卦
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-full h-full">
      <circle cx="24" cy="24" r="16" />
      <circle cx="24" cy="24" r="4" fill="currentColor" />
    </svg>
  )
}

// 智能体头像
const agentAvatars: Record<string, () => React.JSX.Element> = {
  "master": () => (
    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
      <circle cx="24" cy="16" r="10" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.1"/>
      <path d="M8 44 C8 32 15 26 24 26 C33 26 40 32 40 44" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.08"/>
      <path d="M18 8 L24 4 L30 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  "classic": () => (
    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
      <rect x="10" y="6" width="28" height="36" rx="2" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.08"/>
      <line x1="14" y1="14" x2="34" y2="14" stroke="currentColor" strokeWidth="1"/>
      <line x1="14" y1="22" x2="34" y2="22" stroke="currentColor" strokeWidth="1"/>
      <line x1="14" y1="30" x2="28" y2="30" stroke="currentColor" strokeWidth="1"/>
    </svg>
  ),
  "report": () => (
    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
      <rect x="8" y="4" width="32" height="40" rx="3" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.08"/>
      <line x1="14" y1="14" x2="34" y2="14" stroke="currentColor" strokeWidth="1"/>
      <line x1="14" y1="22" x2="34" y2="22" stroke="currentColor" strokeWidth="1"/>
      <line x1="14" y1="30" x2="26" y2="30" stroke="currentColor" strokeWidth="1"/>
      <rect x="14" y="34" width="20" height="6" rx="1" fill="currentColor" fillOpacity="0.15"/>
    </svg>
  ),
  "study": () => (
    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
      <path d="M24 8 L42 16 L24 24 L6 16 Z" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.1"/>
      <path d="M10 18 L10 32 L24 40 L38 32 L38 18" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.05"/>
      <line x1="42" y1="16" x2="42" y2="30" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  ),
  "qimen": () => (
    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
      <rect x="8" y="8" width="32" height="32" rx="2" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.05"/>
      <line x1="8" y1="18.7" x2="40" y2="18.7" stroke="currentColor" strokeWidth="1"/>
      <line x1="8" y1="29.3" x2="40" y2="29.3" stroke="currentColor" strokeWidth="1"/>
      <line x1="18.7" y1="8" x2="18.7" y2="40" stroke="currentColor" strokeWidth="1"/>
      <line x1="29.3" y1="8" x2="29.3" y2="40" stroke="currentColor" strokeWidth="1"/>
      <circle cx="24" cy="24" r="5" fill="currentColor" fillOpacity="0.2"/>
    </svg>
  ),
  "ziwei": () => (
    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
      <rect x="6" y="6" width="36" height="36" stroke="currentColor" strokeWidth="1.5"/>
      <line x1="6" y1="15" x2="42" y2="15" stroke="currentColor" strokeWidth="1"/>
      <line x1="6" y1="33" x2="42" y2="33" stroke="currentColor" strokeWidth="1"/>
      <line x1="15" y1="6" x2="15" y2="42" stroke="currentColor" strokeWidth="1"/>
      <line x1="33" y1="6" x2="33" y2="42" stroke="currentColor" strokeWidth="1"/>
      <rect x="15" y="15" width="18" height="18" fill="currentColor" fillOpacity="0.1"/>
    </svg>
  ),
  "fengshui": () => (
    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
      <circle cx="24" cy="24" r="16" stroke="currentColor" strokeWidth="1.5"/>
      <polygon points="24,10 26,22 24,24 22,22" fill="currentColor"/>
      <polygon points="24,38 22,26 24,24 26,26" fill="currentColor" fillOpacity="0.3"/>
    </svg>
  ),
  "naming": () => (
    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
      <rect x="8" y="8" width="32" height="32" rx="4" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.08"/>
      <text x="24" y="30" textAnchor="middle" fontSize="16" fontWeight="700" fill="currentColor">名</text>
    </svg>
  ),
}

// 中医工具图标
const medicalIcons: Record<string, () => React.JSX.Element> = {
  "tongue": () => (
    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
      <ellipse cx="24" cy="28" rx="12" ry="14" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.1"/>
      <path d="M16 24 Q24 20 32 24" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      <circle cx="20" cy="30" r="2" fill="currentColor" fillOpacity="0.3"/>
      <circle cx="28" cy="30" r="2" fill="currentColor" fillOpacity="0.3"/>
      <path d="M20 36 Q24 38 28 36" stroke="currentColor" strokeWidth="1.5" fill="none"/>
    </svg>
  ),
  "face": () => (
    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
      <circle cx="24" cy="24" r="16" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.08"/>
      <circle cx="18" cy="20" r="2" fill="currentColor"/>
      <circle cx="30" cy="20" r="2" fill="currentColor"/>
      <path d="M18 30 Q24 34 30 30" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      <path d="M16 16 Q18 14 20 16" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M28 16 Q30 14 32 16" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  ),
  "pulse": () => (
    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
      <circle cx="24" cy="24" r="14" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.08"/>
      <path d="M12 24 L18 24 L21 18 L24 30 L27 20 L30 24 L36 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  "constitution": () => (
    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
      <circle cx="24" cy="14" r="6" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.1"/>
      <path d="M24 20 L24 32" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M24 32 L18 42" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M24 32 L30 42" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M16 24 L24 26 L32 24" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="24" cy="26" r="4" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2"/>
    </svg>
  ),
  "acupoint": () => (
    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
      <circle cx="24" cy="24" r="14" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.08"/>
      <circle cx="24" cy="24" r="3" fill="currentColor"/>
      <circle cx="24" cy="14" r="2" fill="currentColor" fillOpacity="0.5"/>
      <circle cx="24" cy="34" r="2" fill="currentColor" fillOpacity="0.5"/>
      <circle cx="14" cy="24" r="2" fill="currentColor" fillOpacity="0.5"/>
      <circle cx="34" cy="24" r="2" fill="currentColor" fillOpacity="0.5"/>
      <path d="M24 16 L24 22 M24 26 L24 32 M16 24 L22 24 M26 24 L32 24" stroke="currentColor" strokeWidth="1" strokeDasharray="2 1"/>
    </svg>
  ),
  "meridian": () => (
    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
      <ellipse cx="24" cy="24" rx="8" ry="16" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.08"/>
      <path d="M24 8 Q32 16 32 24 Q32 32 24 40" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 2"/>
      <path d="M24 8 Q16 16 16 24 Q16 32 24 40" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 2"/>
      <circle cx="24" cy="12" r="2" fill="currentColor"/>
      <circle cx="24" cy="24" r="2" fill="currentColor"/>
      <circle cx="24" cy="36" r="2" fill="currentColor"/>
    </svg>
  ),
  "herb": () => (
    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
      <path d="M24 40 L24 24" stroke="currentColor" strokeWidth="2"/>
      <ellipse cx="24" cy="18" rx="10" ry="8" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.15"/>
      <path d="M18 16 Q24 12 30 16" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M16 20 Q24 24 32 20" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M20 40 Q24 36 28 40" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.1"/>
    </svg>
  ),
  "prescription": () => (
    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
      <rect x="10" y="6" width="28" height="36" rx="2" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.08"/>
      <path d="M16 14 L32 14" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M16 20 L28 20" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.6"/>
      <path d="M16 26 L30 26" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.6"/>
      <path d="M16 32 L26 32" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.6"/>
      <text x="20" y="14" fontSize="8" fontWeight="600" fill="currentColor">方</text>
    </svg>
  ),
  "syndrome": () => (
    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
      <circle cx="24" cy="24" r="14" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.08"/>
      <path d="M24 12 L24 24 L32 28" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="24" cy="24" r="3" fill="currentColor" fillOpacity="0.3"/>
      <text x="24" y="38" textAnchor="middle" fontSize="8" fontWeight="600" fill="currentColor">证</text>
    </svg>
  ),
  "health-calendar": () => (
    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
      <rect x="8" y="12" width="32" height="28" rx="2" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.08"/>
      <path d="M8 20 L40 20" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M16 8 L16 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M32 8 L32 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <text x="24" y="33" textAnchor="middle" fontSize="10" fontWeight="700" fill="currentColor">养</text>
    </svg>
  ),
  "five-elements": () => (
    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
      <circle cx="24" cy="24" r="14" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.08"/>
      <circle cx="24" cy="12" r="3" fill="currentColor" fillOpacity="0.4"/>
      <circle cx="34" cy="20" r="3" fill="currentColor" fillOpacity="0.4"/>
      <circle cx="30" cy="32" r="3" fill="currentColor" fillOpacity="0.4"/>
      <circle cx="18" cy="32" r="3" fill="currentColor" fillOpacity="0.4"/>
      <circle cx="14" cy="20" r="3" fill="currentColor" fillOpacity="0.4"/>
      <path d="M24 15 L31 19 L29 30 L19 30 L17 19 Z" stroke="currentColor" strokeWidth="1" fill="none"/>
    </svg>
  ),
  "food-therapy": () => (
    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
      <ellipse cx="24" cy="32" rx="14" ry="8" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.1"/>
      <path d="M10 32 Q10 24 24 24 Q38 24 38 32" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="18" cy="28" r="3" fill="currentColor" fillOpacity="0.3"/>
      <circle cx="28" cy="30" r="2" fill="currentColor" fillOpacity="0.3"/>
      <path d="M24 10 Q20 16 24 20 Q28 16 24 10" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.2"/>
    </svg>
  ),
  "wuyun": () => (
    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
      <circle cx="24" cy="24" r="14" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.08"/>
      <circle cx="24" cy="24" r="8" stroke="currentColor" strokeWidth="1" strokeDasharray="3 2"/>
      <circle cx="24" cy="24" r="3" fill="currentColor"/>
      <text x="24" y="42" textAnchor="middle" fontSize="7" fontWeight="600" fill="currentColor">五运六气</text>
    </svg>
  ),
  "ziwu": () => (
    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
      <circle cx="24" cy="24" r="14" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.08"/>
      <path d="M24 10 L24 16" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M24 32 L24 38" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M10 24 L16 24" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M32 24 L38 24" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="24" cy="24" r="4" fill="currentColor" fillOpacity="0.3"/>
      <path d="M24 20 L24 24 L28 24" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  ),
  "lingguibafa": () => (
    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
      <path d="M24 8 L38 18 L38 32 L24 42 L10 32 L10 18 Z" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.08"/>
      <circle cx="24" cy="24" r="6" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.15"/>
      <text x="24" y="27" textAnchor="middle" fontSize="8" fontWeight="700" fill="currentColor">龟</text>
    </svg>
  ),
  "health-ai": () => (
    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
      <rect x="12" y="8" width="24" height="32" rx="4" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.08"/>
      <circle cx="24" cy="20" r="6" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M21 19 L23 21 L27 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M18 32 L30 32" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M20 36 L28 36" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.5"/>
    </svg>
  ),
}

// 获取中医工具图标
export function getMedicalIcon(iconId: string): React.ReactNode {
  const IconComponent = medicalIcons[iconId]
  if (IconComponent) {
    return <IconComponent />
  }
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-full h-full">
      <circle cx="24" cy="24" r="14"/>
      <path d="M24 16 L24 32 M16 24 L32 24" strokeWidth="2"/>
    </svg>
  )
}

// 获取智能体头像
export function getAgentAvatar(avatarId: string): React.ReactNode {
  const AvatarComponent = agentAvatars[avatarId]
  if (AvatarComponent) {
    return <AvatarComponent />
  }
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-full h-full">
      <circle cx="24" cy="16" r="8"/>
      <path d="M10 44 C10 34 16 28 24 28 C32 28 38 34 38 44"/>
    </svg>
  )
}
