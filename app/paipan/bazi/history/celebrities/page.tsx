"use client"

import { useState } from "react"
import Link from "next/link"
import { ChevronLeft, Search, Lock } from "lucide-react"

// 五行颜色映射
const wuxingColors: Record<string, string> = {
  "甲": "text-green-600", "乙": "text-green-600",
  "丙": "text-red-500", "丁": "text-red-500",
  "戊": "text-yellow-600", "己": "text-yellow-600",
  "庚": "text-amber-500", "辛": "text-amber-500",
  "壬": "text-blue-500", "癸": "text-blue-500",
  "子": "text-blue-500", "丑": "text-yellow-600",
  "寅": "text-green-600", "卯": "text-green-600",
  "辰": "text-yellow-600", "巳": "text-red-500",
  "午": "text-red-500", "未": "text-yellow-600",
  "申": "text-amber-500", "酉": "text-amber-500",
  "戌": "text-yellow-600", "亥": "text-blue-500",
}

// 一级分类
const primaryCategories = ["名人案例", "大众案例"]

// 二级分类
const secondaryCategories: Record<string, string[]> = {
  "名人案例": ["君主", "商界", "文艺", "体育", "历史", "军事", "僧道"],
  "大众案例": ["财运", "事业", "婚姻", "健康", "学业", "灾厄", "长寿"]
}

// 模拟案例数据
const caseData = [
  // 名人案例
  { id: 1, name: "崇祯", gender: "male", desc: "明朝", subtitle: "末位皇帝", primary: "名人案例", secondary: "君主", bazi: ["辛", "庚", "乙", "己", "亥", "寅", "未", "卯"], letter: "C", zodiac: "猪" },
  { id: 2, name: "曹操", gender: "male", desc: "东汉末年", subtitle: "魏武帝", primary: "名人案例", secondary: "君主", bazi: ["乙", "丁", "庚", "甲", "丑", "亥", "戌", "申"], letter: "C", zodiac: "牛" },
  { id: 3, name: "忽必烈", gender: "male", desc: "元朝", subtitle: "开国皇帝", primary: "名人案例", secondary: "君主", bazi: ["乙", "乙", "乙", "乙", "亥", "酉", "酉", "酉"], letter: "H", zodiac: "猪" },
  { id: 4, name: "康熙", gender: "male", desc: "清朝", subtitle: "圣祖皇帝", primary: "名人案例", secondary: "君主", bazi: ["甲", "丙", "戊", "庚", "午", "寅", "申", "子"], letter: "K", zodiac: "马" },
  { id: 5, name: "李白", gender: "male", desc: "唐朝", subtitle: "诗仙", primary: "名人案例", secondary: "文艺", bazi: ["辛", "庚", "甲", "壬", "丑", "寅", "子", "申"], letter: "L", zodiac: "牛" },
  { id: 6, name: "武则天", gender: "female", desc: "唐朝", subtitle: "唯一女皇帝", primary: "名人案例", secondary: "君主", bazi: ["甲", "丙", "甲", "甲", "申", "寅", "午", "戌"], letter: "W", zodiac: "猴" },
  { id: 7, name: "朱元璋", gender: "male", desc: "明朝", subtitle: "开国皇帝", primary: "名人案例", secondary: "君主", bazi: ["戊", "壬", "丁", "丁", "辰", "戌", "丑", "未"], letter: "Z", zodiac: "龙" },
  { id: 8, name: "马云", gender: "male", desc: "当代", subtitle: "阿里巴巴创始人", primary: "名人案例", secondary: "商界", bazi: ["甲", "丙", "甲", "壬", "辰", "寅", "子", "申"], letter: "M", zodiac: "龙" },
  // 大众案例
  { id: 101, name: "案例A01", gender: "male", desc: "白手起家", subtitle: "从打工到身家过亿", primary: "大众案例", secondary: "财运", bazi: ["甲", "丙", "戊", "庚", "子", "寅", "辰", "午"], letter: "A", zodiac: "鼠" },
  { id: 102, name: "案例B02", gender: "female", desc: "职场晋升", subtitle: "30岁成为上市公司高管", primary: "大众案例", secondary: "事业", bazi: ["乙", "丁", "己", "辛", "丑", "卯", "巳", "未"], letter: "B", zodiac: "牛" },
  { id: 103, name: "案例C03", gender: "female", desc: "幸福婚姻", subtitle: "晚婚却遇良人", primary: "大众案例", secondary: "婚姻", bazi: ["丙", "戊", "庚", "壬", "寅", "辰", "午", "申"], letter: "C", zodiac: "虎" },
  { id: 104, name: "案例D04", gender: "male", desc: "健康长寿", subtitle: "90岁依然健步如飞", primary: "大众案例", secondary: "长寿", bazi: ["丁", "己", "辛", "癸", "卯", "巳", "未", "酉"], letter: "D", zodiac: "兔" },
  { id: 105, name: "案例E05", gender: "male", desc: "学业有成", subtitle: "寒门出贵子考入清华", primary: "大众案例", secondary: "学业", bazi: ["戊", "庚", "壬", "甲", "辰", "午", "申", "戌"], letter: "E", zodiac: "龙" },
]

// 字母索引
const letterIndex = ["A", "B", "C", "D", "E", "F", "G", "H", "J", "K", "L", "M", "N", "P", "Q", "R", "S", "T", "W", "X", "Y", "Z"]

export default function CelebritiesPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [activePrimary, setActivePrimary] = useState("名人案例")
  const [activeSecondary, setActiveSecondary] = useState("君主")
  const [isVip] = useState(false) // VIP状态

  // 切换一级分类时重置二级分类
  const handlePrimaryChange = (primary: string) => {
    setActivePrimary(primary)
    setActiveSecondary(secondaryCategories[primary][0])
  }

  // 根据分类和搜索过滤
  const filteredCases = caseData.filter(c => {
    const matchPrimary = c.primary === activePrimary
    const matchSecondary = c.secondary === activeSecondary
    const matchSearch = searchQuery === "" || c.name.includes(searchQuery) || c.desc.includes(searchQuery)
    return matchPrimary && matchSecondary && matchSearch
  })

  // 按字母分组
  const groupedByLetter = filteredCases.reduce((acc, item) => {
    const letter = item.letter
    if (!acc[letter]) acc[letter] = []
    acc[letter].push(item)
    return acc
  }, {} as Record<string, typeof caseData>)

  // 可用的字母
  const availableLetters = Object.keys(groupedByLetter).sort()

  const scrollToLetter = (letter: string) => {
    const element = document.getElementById(`letter-${letter}`)
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* 顶部导航 */}
      <div className="bg-card border-b border-border">
        <div className="flex items-center justify-center py-3 px-4 relative">
          <Link href="/bazi/history" className="absolute left-4 p-1">
            <ChevronLeft className="w-5 h-5 text-muted-foreground" />
          </Link>
          
          {/* 切换标签 */}
          <div className="flex bg-secondary rounded-full p-0.5">
            <Link
              href="/bazi/history"
              className="px-5 py-1.5 text-sm font-medium rounded-full text-muted-foreground"
            >
              用户列表
            </Link>
            <button className="px-5 py-1.5 text-sm font-medium rounded-full bg-card text-foreground shadow-sm relative">
              案例库
              <span className="absolute -top-1 -right-1 px-1 py-0.5 text-[10px] font-medium text-bronze bg-bronze-light rounded">VIP</span>
            </button>
          </div>
        </div>
      </div>

      {/* 搜索栏 */}
      <div className="bg-card px-4 py-3 border-b border-border/60">
        <div className="flex items-center gap-3">
          <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-secondary rounded-lg">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="请输入搜索的内容"
              className="flex-1 bg-transparent text-sm text-foreground placeholder-muted-foreground outline-none"
            />
          </div>
          <button className="px-4 py-2 text-sm text-muted-foreground bg-secondary rounded-lg hover:bg-secondary/80 transition-colors">
            筛选
          </button>
        </div>
      </div>

      {/* 一级分类标签 */}
      <div className="bg-card border-b border-border/60">
        <div className="flex px-4 py-2 gap-6">
          {primaryCategories.map((category) => (
            <button
              key={category}
              onClick={() => handlePrimaryChange(category)}
              className={`whitespace-nowrap text-sm font-semibold pb-1.5 border-b-2 transition-colors ${
                activePrimary === category
                  ? "text-primary border-primary"
                  : "text-muted-foreground border-transparent hover:text-foreground"
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* 二级分类标签 */}
      <div className="bg-background border-b border-border/60">
        <div className="flex overflow-x-auto scrollbar-hide px-4 py-2 gap-3">
          {secondaryCategories[activePrimary].map((category) => (
            <button
              key={category}
              onClick={() => setActiveSecondary(category)}
              className={`whitespace-nowrap px-3 py-1 rounded-full text-sm transition-colors ${
                activeSecondary === category
                  ? "bg-bronze-light text-bronze font-medium"
                  : "bg-card text-muted-foreground hover:bg-secondary"
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* 名人列表 */}
      <div className="flex-1 overflow-y-auto relative">
        <div className="divide-y divide-border/60">
          {availableLetters.map((letter) => (
            <div key={letter}>
              {/* 字母分组标题 */}
              <div 
                id={`letter-${letter}`}
                className="px-4 py-1.5 bg-secondary text-sm font-medium text-muted-foreground"
              >
                {letter}
              </div>
              
              {/* 该字母下的案例 */}
              {groupedByLetter[letter].map((item, index) => {
                const isLocked = !isVip && index > 0
                
                return (
                  <div 
                    key={item.id}
                    className={`flex items-center gap-3 px-4 py-3 bg-card ${isLocked ? "opacity-40" : ""}`}
                  >
                    {/* 信息 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-lg font-bold ${isLocked ? "blur-[2px]" : "text-foreground"}`}>
                          {item.name}
                        </span>
                        <span className="text-xs text-gray-400">
                          {item.gender === "male" ? "男" : "女"}
                        </span>
                      </div>
                      <div className={`text-xs text-gray-400 mt-0.5 ${isLocked ? "blur-[2px]" : ""}`}>
                        {item.desc} {item.subtitle}
                      </div>
                    </div>

                    {/* 四柱八字 */}
                    <div className={`text-right ${isLocked ? "blur-[3px]" : ""}`}>
                      <div className="flex gap-0.5 justify-end text-sm font-medium">
                        {item.bazi.slice(0, 4).map((char, i) => (
                          <span key={i} className={wuxingColors[char] || "text-gray-700"}>{char}</span>
                        ))}
                      </div>
                      <div className="flex gap-0.5 justify-end text-sm font-medium mt-0.5">
                        {item.bazi.slice(4, 8).map((char, i) => (
                          <span key={i} className={wuxingColors[char] || "text-gray-700"}>{char}</span>
                        ))}
                      </div>
                    </div>

                    {/* 生肖图标 */}
                    <div className={`w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center ${isLocked ? "blur-[2px]" : ""}`}>
                      <span className="text-amber-400 text-xs font-medium">{item.zodiac}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        {/* 字母快速导航 */}
        <div className="fixed right-1 top-1/2 -translate-y-1/2 flex flex-col items-center text-[10px] text-muted-foreground">
          {availableLetters.map((letter) => (
            <button
              key={letter}
              onClick={() => scrollToLetter(letter)}
              className="px-1 py-0.5 hover:text-bronze transition-colors"
            >
              {letter}
            </button>
          ))}
        </div>
      </div>

      {/* VIP解锁提示 */}
      {!isVip && (
        <div className="bg-card border-t border-border p-4">
          <button className="w-full py-3 bg-gradient-to-r from-bronze to-bronze/80 text-white font-medium rounded-full shadow-lg flex items-center justify-center gap-2">
            <Lock className="w-4 h-4" />
            开通钻石会员解锁
          </button>
          <p className="mt-3 text-xs text-muted-foreground text-center leading-relaxed">
            案例库收录了500+八字案例，包含名人案例（君主、商界、文艺、体育等）和大众案例（财运、事业、婚姻、健康等），让您通过真实案例学习验证八字命理。案例数据持续更新中......
          </p>
        </div>
      )}
    </div>
  )
}
