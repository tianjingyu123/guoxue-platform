"use client"

import { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, Share2, Sparkles, BookOpen, Save, X } from "lucide-react"
import { NotesPanel } from "@/components/bazi/notes-panel"
import { Disclaimer } from "@/components/compliance/disclaimer"

// ─── 五行颜色映射 ───
const wuxingColors: Record<string, string> = {
  "甲": "text-wuxing-wood", "乙": "text-wuxing-wood",
  "丙": "text-wuxing-fire", "丁": "text-wuxing-fire",
  "戊": "text-wuxing-earth", "己": "text-wuxing-earth",
  "庚": "text-wuxing-metal", "辛": "text-wuxing-metal",
  "壬": "text-wuxing-water", "癸": "text-wuxing-water",
  "子": "text-wuxing-water", "丑": "text-wuxing-earth",
  "寅": "text-wuxing-wood", "卯": "text-wuxing-wood",
  "辰": "text-wuxing-earth", "巳": "text-wuxing-fire",
  "午": "text-wuxing-fire", "未": "text-wuxing-earth",
  "申": "text-wuxing-metal", "酉": "text-wuxing-metal",
  "戌": "text-wuxing-earth", "亥": "text-wuxing-water",
}

// ─── 宫位名称 ───
const PALACE_NAMES: Record<number, string> = {
  4: "巽四宫", 9: "离九宫", 2: "坤二宫",
  3: "震三宫", 5: "中五宫", 7: "兑七宫",
  8: "艮八宫", 1: "坎一宫", 6: "乾六宫"
}
const PALACE_ORDER = [4, 9, 2, 3, 5, 7, 8, 1, 6]

// ─── 模拟盘面数据 ───
const palaceData: Record<number, {
  bashen: string; jiuxing: string; bamen: string;
  tianGan: string; diGan: string; anGan: string;
  dipanShen: string; dipanMen: string;
  kongwang: boolean; maXing: boolean;
  changsheng: { tian: string; an: string };
  isZhifu?: boolean; isZhishi?: boolean;
}> = {
  4: { bashen: "值符", jiuxing: "天蓬", bamen: "休门", tianGan: "戊", diGan: "庚", anGan: "癸", dipanShen: "腾蛇", dipanMen: "生", kongwang: true, maXing: false, changsheng: { tian: "长生", an: "沐浴" }, isZhifu: true },
  9: { bashen: "腾蛇", jiuxing: "天芮", bamen: "生门", tianGan: "己", diGan: "辛", anGan: "乙", dipanShen: "太阴", dipanMen: "伤", kongwang: false, maXing: true, changsheng: { tian: "冠带", an: "临官" } },
  2: { bashen: "太阴", jiuxing: "天冲", bamen: "伤门", tianGan: "庚", diGan: "壬", anGan: "丙", dipanShen: "六合", dipanMen: "杜", kongwang: false, maXing: false, changsheng: { tian: "帝旺", an: "衰" } },
  3: { bashen: "六合", jiuxing: "天辅", bamen: "杜门", tianGan: "辛", diGan: "癸", anGan: "丁", dipanShen: "白虎", dipanMen: "景", kongwang: true, maXing: false, changsheng: { tian: "墓", an: "死" } },
  5: { bashen: "勾陈", jiuxing: "天禽", bamen: "中宫", tianGan: "壬", diGan: "甲", anGan: "戊", dipanShen: "玄武", dipanMen: "死", kongwang: false, maXing: false, changsheng: { tian: "绝", an: "胎" } },
  7: { bashen: "白虎", jiuxing: "天心", bamen: "惊门", tianGan: "癸", diGan: "乙", anGan: "己", dipanShen: "九地", dipanMen: "惊", kongwang: false, maXing: false, changsheng: { tian: "养", an: "长生" } },
  8: { bashen: "玄武", jiuxing: "天柱", bamen: "死门", tianGan: "甲", diGan: "丙", anGan: "庚", dipanShen: "九天", dipanMen: "开", kongwang: false, maXing: false, changsheng: { tian: "沐浴", an: "冠带" } },
  1: { bashen: "九地", jiuxing: "天任", bamen: "景门", tianGan: "乙", diGan: "丁", anGan: "辛", dipanShen: "值符", dipanMen: "休", kongwang: false, maXing: true, changsheng: { tian: "临官", an: "帝旺" } },
  6: { bashen: "九天", jiuxing: "天英", bamen: "开门", tianGan: "丙", diGan: "戊", anGan: "壬", dipanShen: "勾陈", dipanMen: "生", kongwang: false, maXing: false, changsheng: { tian: "衰", an: "墓" }, isZhishi: true },
}

// ─── 大运数据 ───
const daYunData = [
  { year: 1990, gan: "戊", zhi: "午", shiShen: "伤", shiShenZhi: "劫", age: 0 },
  { year: 1994, gan: "丁", zhi: "巳", shiShen: "比", shiShenZhi: "枭", age: 4 },
  { year: 2004, gan: "丙", zhi: "辰", shiShen: "劫", shiShenZhi: "食", age: 14 },
  { year: 2014, gan: "乙", zhi: "卯", shiShen: "枭", shiShenZhi: "枭", age: 24 },
  { year: 2024, gan: "甲", zhi: "寅", shiShen: "印", shiShenZhi: "印", age: 34, active: true },
  { year: 2034, gan: "癸", zhi: "丑", shiShen: "杀", shiShenZhi: "食", age: 44 },
  { year: 2044, gan: "壬", zhi: "子", shiShen: "官", shiShenZhi: "官", age: 54 },
  { year: 2054, gan: "辛", zhi: "亥", shiShen: "才", shiShenZhi: "官", age: 64 },
]

// ─── 流年数据 ───
const liuNianData = [
  { year: 2024, gan: "甲", zhi: "辰", shiShen: "印", shiShenZhi: "食", age: 34 },
  { year: 2025, gan: "乙", zhi: "巳", shiShen: "枭", shiShenZhi: "枭", age: 35 },
  { year: 2026, gan: "丙", zhi: "午", shiShen: "劫", shiShenZhi: "劫", age: 36, active: true },
  { year: 2027, gan: "丁", zhi: "未", shiShen: "比", shiShenZhi: "食", age: 37 },
  { year: 2028, gan: "戊", zhi: "申", shiShen: "伤", shiShenZhi: "才", age: 38 },
  { year: 2029, gan: "己", zhi: "酉", shiShen: "食", shiShenZhi: "才", age: 39 },
  { year: 2030, gan: "庚", zhi: "戌", shiShen: "财", shiShenZhi: "伤", age: 40 },
  { year: 2031, gan: "辛", zhi: "亥", shiShen: "才", shiShenZhi: "官", age: 41 },
  { year: 2032, gan: "壬", zhi: "子", shiShen: "官", shiShenZhi: "官", age: 42 },
  { year: 2033, gan: "癸", zhi: "丑", shiShen: "杀", shiShenZhi: "食", age: 43 },
]

// ─── 宫位详情面板 ───
function PalaceDetail({ palace, onClose }: { palace: number; onClose: () => void }) {
  const d = palaceData[palace]
  if (!d) return null
  return (
    <div className="bg-card border-t border-border shadow-lg">
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-primary">{PALACE_NAMES[palace]}</h3>
          <button onClick={onClose} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-full transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <div className="text-sm text-foreground leading-relaxed bg-secondary/30 rounded-lg p-3">
          <span className="text-primary font-semibold">{PALACE_NAMES[palace]}</span>：
          八神{d.bashen}，九星{d.jiuxing}，八门{d.bamen}，天盘{d.diGan}，地盘{d.tianGan}。
        </div>
      </div>
    </div>
  )
}

// ─── 主内容组件 ───
function YangpanResultContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // 从URL获取参数
  const name = searchParams.get("name") || ""
  const gender = searchParams.get("gender") || "male"
  const year = Number(searchParams.get("year")) || 1990
  const month = Number(searchParams.get("month")) || 1
  const day = Number(searchParams.get("day")) || 1
  const hour = Number(searchParams.get("hour")) || 12
  const minute = Number(searchParams.get("minute")) || 0
  const panMethod = searchParams.get("panMethod") || "zhuan"
  const jigongMethod = searchParams.get("jigongMethod") || "kungong"
  const startMethod = searchParams.get("startMethod") || "chaibu"
  
  // 状态
  const [showNotes, setShowNotes] = useState(false)
  const [selectedPalace, setSelectedPalace] = useState<number | null>(null)
  const [showChangsheng, setShowChangsheng] = useState(false)
  const [showDipanShen, setShowDipanShen] = useState(false)
  const [expandedDaYun, setExpandedDaYun] = useState<number | null>(null)
  
  // 模拟四柱数据（带五行颜色）
  const sizhu = {
    year: { g: "庚", z: "午" },
    month: { g: "戊", z: "寅" },
    day: { g: "丁", z: "丑" },
    hour: { g: "丁", z: "未" }
  }
  
  // 模拟空亡数据
  const kongwangData = [
    { label: "年", zhi: "子丑" },
    { label: "月", zhi: "子丑" },
    { label: "日", zhi: "申酉" },
    { label: "时", zhi: "寅卯" },
  ]
  const [selectedKongwang, setSelectedKongwang] = useState(2)
  
  // 马星
  const maXing = "亥"
  
  // 盘式信息
  const panshi = `${panMethod === "zhuan" ? "转盘" : "飞盘"} ${jigongMethod === "kungong" ? "坤宫" : "阳艮阴坤"} ${startMethod === "chaibu" ? "拆补" : startMethod === "maoshan" ? "茅山" : "置闰"}`
  
  // 跳转到八字
  const goToBazi = () => {
    const params = new URLSearchParams({
      name,
      gender,
      year: String(year),
      month: String(month),
      day: String(day),
      hour: String(hour),
      minute: String(minute),
    })
    router.push(`/paipan/bazi/result?${params.toString()}`)
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-20 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 h-12">
          <Link href="/paipan/yangpan" className="p-1 -ml-1">
            <ChevronLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-base font-bold">阳盘命理奇门</h1>
          <button className="p-1 -mr-1">
            <Share2 className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-4">
        {/* 信息表格 */}
        <div className="px-3 pt-2 text-[13px]">
          <div className="bg-card rounded-xl border border-border/60 overflow-hidden shadow-sm">
            <table className="w-full border-collapse">
              <tbody>
                <tr className="border-b border-border/40">
                  <td className="py-2 px-3 text-primary font-medium w-16">姓名</td>
                  <td className="py-2 px-2 text-foreground">{name || "未填写"}</td>
                </tr>
                <tr className="border-b border-border/40">
                  <td className="py-2 px-3 text-primary font-medium">性别</td>
                  <td className="py-2 px-2 text-foreground">{gender === "male" ? "男" : "女"}</td>
                </tr>
                <tr className="border-b border-border/40">
                  <td className="py-2 px-3 text-primary font-medium">盘式</td>
                  <td className="py-2 px-2 text-foreground text-xs">{panshi}</td>
                </tr>
                <tr className="border-b border-border/40">
                  <td className="py-2 px-3 text-primary font-medium">出生</td>
                  <td className="py-2 px-2 text-foreground">{year}年{String(month).padStart(2,'0')}月{String(day).padStart(2,'0')}日 {hour}时{minute}分</td>
                </tr>
                {/* 四柱 - 带五行颜色 */}
                <tr className="border-b border-border/40">
                  <td className="py-2 px-3 text-primary font-medium align-top">四柱</td>
                  <td className="py-2 px-2">
                    <div className="grid grid-cols-4 gap-1">
                      {[
                        { label: "年柱", ...sizhu.year },
                        { label: "月柱", ...sizhu.month },
                        { label: "日柱", ...sizhu.day },
                        { label: "时柱", ...sizhu.hour }
                      ].map((z, i) => (
                        <div key={i} className="text-center bg-gradient-to-b from-primary/5 to-primary/10 rounded-lg py-1.5 border border-primary/10">
                          <div className="text-[9px] text-muted-foreground mb-0.5">{z.label}</div>
                          <div className="leading-tight">
                            <span className={`font-bold text-lg ${wuxingColors[z.g]}`}>{z.g}</span>
                            <br />
                            <span className={`font-bold text-lg ${wuxingColors[z.z]}`}>{z.z}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </td>
                </tr>
                {/* 空亡 */}
                <tr className="border-b border-border/40">
                  <td className="py-2 px-3 text-primary font-medium align-top">空亡</td>
                  <td className="py-2 px-2">
                    <div className="grid grid-cols-4 gap-1">
                      {kongwangData.map((k, i) => (
                        <button 
                          key={i}
                          onClick={() => setSelectedKongwang(i)}
                          className={`py-1.5 rounded-lg text-sm font-medium transition-all ${selectedKongwang === i ? "bg-primary text-white shadow-sm" : "bg-secondary/40 text-foreground hover:bg-secondary/70"}`}
                        >
                          {k.zhi}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
                <tr className="border-b border-border/40">
                  <td className="py-2 px-3 text-primary font-medium">节气</td>
                  <td className="py-2 px-2 text-foreground text-xs">
                    <span className="text-primary font-medium">立夏</span> {year}.05.05 ~ <span className="text-primary font-medium">小满</span> {year}.05.21
                  </td>
                </tr>
                {/* 旬首/局数/值符/值使/马星 */}
                <tr className="border-b border-border/40 bg-secondary/20">
                  <td className="py-1.5 px-3 text-primary font-medium">旬首</td>
                  <td className="py-1.5 px-2">
                    <div className="grid grid-cols-4 text-center text-[10px] text-primary font-medium">
                      <span>局数</span><span>值符</span><span>值使</span><span>马星</span>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-3 text-foreground text-sm font-medium">甲午辛</td>
                  <td className="py-2 px-2">
                    <div className="grid grid-cols-4 text-center text-sm">
                      <span className="text-foreground font-medium">阳9局</span>
                      <span className="text-emerald-600 font-semibold">天蓬</span>
                      <span className="text-emerald-600 font-semibold">休门</span>
                      <span className="px-2 py-0.5 bg-gradient-to-r from-amber-400 to-orange-400 text-white text-xs font-bold rounded">{maXing}</span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 九宫格 */}
        <div className="px-3 py-2">
          <div className="border border-foreground/40 rounded-lg overflow-hidden bg-card shadow-sm">
            <div className="grid grid-cols-3">
              {PALACE_ORDER.map((palace) => {
                const d = palaceData[palace]
                const isCenter = palace === 5
                const isSelected = selectedPalace === palace
                const showKw = d.kongwang && selectedKongwang !== null
                const showMa = d.maXing
                
                return (
                  <div
                    key={palace}
                    onClick={() => setSelectedPalace(isSelected ? null : palace)}
                    className={`border-r border-b border-foreground/30 [&:nth-child(3n)]:border-r-0 [&:nth-child(n+7)]:border-b-0 h-[118px] cursor-pointer transition-all relative ${isSelected ? "bg-primary/10 ring-1 ring-inset ring-primary/30" : "hover:bg-secondary/30"} ${isCenter ? "bg-gradient-to-br from-amber-50/50 to-orange-50/30" : ""}`}
                  >
                    {/* 马星徽章 */}
                    {showMa && (
                      <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 text-[9px] text-white font-bold bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 rounded-sm shadow-md ring-1 ring-amber-600/20">马</span>
                    )}
                    
                    {/* 主信息布局 */}
                    <div className="absolute inset-0 p-2 flex">
                      {/* 列1 */}
                      <div className="flex flex-col justify-between w-4 shrink-0">
                        <div className="h-[30px] flex items-center justify-center">
                          {showKw && <span className="w-3.5 h-3.5 rounded-full border-[1.5px] border-dashed border-primary" />}
                        </div>
                        <div className="h-[30px] flex items-center justify-center">
                          <span className="text-[11px] text-muted-foreground">{d.tianGan}</span>
                        </div>
                        <div className="h-[30px] flex items-center justify-center">
                          {showDipanShen && <span className="text-[10px] text-muted-foreground animate-fade-in">{d.dipanShen}</span>}
                        </div>
                      </div>
                      
                      {/* 列2 */}
                      <div className="flex flex-col justify-between flex-1 ml-1">
                        <div className="h-[30px] flex items-center">
                          <span className="text-[15px] font-medium text-foreground tracking-wide">{d.bashen}</span>
                        </div>
                        <div className="h-[30px] flex items-center">
                          <span className="text-[15px] font-medium text-foreground tracking-wide">{d.jiuxing}</span>
                        </div>
                        <div className="h-[30px] flex items-center">
                          <span className="text-[15px] font-medium text-foreground tracking-wide">{d.bamen}</span>
                        </div>
                      </div>
                      
                      {/* 列3 */}
                      <div className="flex flex-col justify-between items-end">
                        <div className="h-[30px]" />
                        <div className="h-[30px] flex items-center justify-end gap-0.5">
                          {showChangsheng && d.changsheng.tian && <span className="text-[10px] text-muted-foreground animate-fade-in">{d.changsheng.tian.slice(0,2)}</span>}
                          <span className="text-[15px] text-foreground">{d.diGan}</span>
                        </div>
                        <div className="h-[30px] flex items-center justify-end gap-0.5">
                          {showChangsheng && d.changsheng.an && <span className="text-[10px] text-muted-foreground animate-fade-in">{d.changsheng.an.slice(0,2)}</span>}
                          <span className="text-[15px] text-foreground">{d.anGan}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          
          {/* 操作按钮 - 切换到八字替代上一局下一局 */}
          <div className="flex gap-2 mt-3">
            <button onClick={() => setShowChangsheng(!showChangsheng)} className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${showChangsheng ? "bg-primary text-white shadow-md" : "bg-card border border-border text-foreground hover:bg-secondary/50 hover:border-primary/30"}`}>长生状态</button>
            <button onClick={goToBazi} className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md hover:shadow-lg transition-all">切换到八字</button>
            <button onClick={() => setShowDipanShen(!showDipanShen)} className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${showDipanShen ? "bg-primary text-white shadow-md" : "bg-card border border-border text-foreground hover:bg-secondary/50 hover:border-primary/30"}`}>地盘九神</button>
          </div>
          <div className="text-center text-[11px] text-muted-foreground mt-2">点击宫位查看详细信息</div>
        </div>

        {/* 宫位详情 */}
        {selectedPalace && (
          <div className="px-3">
            <PalaceDetail palace={selectedPalace} onClose={() => setSelectedPalace(null)} />
          </div>
        )}

        {/* 大运流年 - 从八字搬过来 */}
        <div className="px-3 mt-4">
          <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
            <div className="px-3 py-2.5 border-b border-border flex items-center justify-between">
              <span className="text-sm font-bold text-primary">大运</span>
              <span className="text-xs text-muted-foreground">点击展开流年</span>
            </div>
            <table className="w-full text-center">
              <tbody>
                <tr className="text-[11px] text-muted-foreground">
                  {daYunData.map((d, i) => <td key={i} className="pt-1">{d.year}</td>)}
                </tr>
                <tr>
                  {daYunData.map((d, i) => (
                    <td key={i} className={`cursor-pointer transition-colors ${d.active ? "bg-primary/8" : expandedDaYun === i ? "bg-secondary" : ""}`} onClick={() => setExpandedDaYun(expandedDaYun === i ? null : i)}>
                      <span className={`text-xl font-black leading-none ${wuxingColors[d.gan]}`}>{d.gan}</span>
                      <span className="text-[9px] text-muted-foreground align-top ml-px">{d.shiShen}</span>
                    </td>
                  ))}
                </tr>
                <tr>
                  {daYunData.map((d, i) => (
                    <td key={i} className={`cursor-pointer transition-colors ${d.active ? "bg-primary/8" : expandedDaYun === i ? "bg-secondary" : ""}`} onClick={() => setExpandedDaYun(expandedDaYun === i ? null : i)}>
                      <span className={`text-xl font-black leading-none ${wuxingColors[d.zhi]}`}>{d.zhi}</span>
                      <span className="text-[9px] text-muted-foreground align-top ml-px">{d.shiShenZhi}</span>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
            {expandedDaYun !== null && (
              <div className="border-t border-border p-2.5 bg-secondary/30">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-foreground font-medium">{daYunData[expandedDaYun].year}-{daYunData[expandedDaYun].year + 9} 流年</span>
                  <button onClick={() => setExpandedDaYun(null)} className="text-xs text-primary">收起</button>
                </div>
                <div className="grid grid-cols-5 gap-1.5">
                  {Array.from({ length: 10 }, (_, i) => {
                    const y = daYunData[expandedDaYun].year + i
                    return (
                      <div key={i} className="bg-card rounded p-1.5 text-center border border-border">
                        <div className="text-[10px] text-muted-foreground">{y}</div>
                        <div>
                          <span className={`text-base font-bold ${wuxingColors[liuNianData[i % 10]?.gan || "甲"]}`}>{liuNianData[i % 10]?.gan || "甲"}</span>
                        </div>
                        <div>
                          <span className={`text-base font-bold ${wuxingColors[liuNianData[i % 10]?.zhi || "子"]}`}>{liuNianData[i % 10]?.zhi || "子"}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 流年 - 完全按照八字的一行横向表格显示 */}
        <div className="px-3 mt-3">
          <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
            <div className="px-3 py-2.5 border-b border-border">
              <span className="text-sm font-bold text-primary">流年</span>
            </div>
            <table className="w-full text-center">
              <tbody>
                <tr className="text-[11px] text-muted-foreground">
                  {liuNianData.map((n, i) => <td key={i} className="pt-1">{n.year}</td>)}
                </tr>
                <tr>
                  {liuNianData.map((n, i) => (
                    <td key={i} className={`${n.active ? "bg-primary/8" : ""}`}>
                      <span className={`text-lg font-bold ${wuxingColors[n.gan]}`}>{n.gan}</span><span className="text-[9px] text-muted-foreground align-top ml-px">{n.shiShen}</span>
                    </td>
                  ))}
                </tr>
                <tr>
                  {liuNianData.map((n, i) => (
                    <td key={i} className={`${n.active ? "bg-primary/8" : ""}`}>
                      <span className={`text-lg font-bold ${wuxingColors[n.zhi]}`}>{n.zhi}</span><span className="text-[9px] text-muted-foreground align-top ml-px">{n.shiShenZhi}</span>
                    </td>
                  ))}
                </tr>
                <tr className="text-[10px] text-muted-foreground">
                  {liuNianData.map((n, i) => <td key={i} className={`pb-1 ${n.active ? "bg-primary/8" : ""}`}>{n.age}岁</td>)}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* AI解析和保存按钮 */}
        <div className="px-3 mt-4 flex gap-3">
          <button className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-medium flex items-center justify-center gap-2 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all">
            <Sparkles className="w-4 h-4" />
            AI智能解析
          </button>
          <button className="px-6 py-3 rounded-xl bg-secondary text-foreground border border-border font-medium flex items-center justify-center gap-2 hover:bg-secondary/70 transition-all">
            <Save className="w-4 h-4" />
            保存
          </button>
        </div>

        {/* 合规免责声明 */}
        <div className="px-3 mt-4">
          <Disclaimer variant="fortune" tone="card" />
        </div>
      </main>

      {/* 悬浮笔记按钮 */}
      <div className="fixed right-4 bottom-6 z-10">
        <button onClick={() => setShowNotes(true)} className="w-12 h-12 bg-card rounded-full shadow-lg shadow-black/10 border border-border/80 flex flex-col items-center justify-center gap-0.5 hover:shadow-xl hover:scale-105 transition-all">
          <BookOpen className="w-4 h-4 text-primary" />
          <span className="text-[8px] text-primary font-medium">笔记</span>
        </button>
      </div>

      {/* 笔记面板 - 使用八字的笔记组件 */}
      <NotesPanel open={showNotes} onClose={() => setShowNotes(false)} />
    </div>
  )
}

export default function YangpanResultPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center">加载中...</div>}>
      <YangpanResultContent />
    </Suspense>
  )
}
