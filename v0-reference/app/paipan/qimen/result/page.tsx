"use client"

import { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, Pencil, Share2, Sparkles, BookOpen, Save, X } from "lucide-react"
import { QimenNotesPanel } from "@/components/paipan/qimen/notes-panel"
import { Disclaimer } from "@/components/compliance/disclaimer"

// ─── 奇门常量 ───
const PALACE_ORDER = [4, 9, 2, 3, 5, 7, 8, 1, 6] // 洛书九宫: 巽离坤/震中兑/艮坎乾
const PALACE_NAMES = ["", "坎1宫", "坤2宫", "震3宫", "巽4宫", "中5宫", "乾6宫", "兑7宫", "艮8宫", "离9宫"]
const BASHEN = ["", "值符", "腾蛇", "太阴", "六合", "勾陈", "太常", "九地", "九天", "朱雀"]
const JIUXING = ["", "天蓬", "天芮", "天冲", "天辅", "天禽", "天心", "天柱", "天任", "天英"]
const BAMEN = ["", "休门", "死门", "伤门", "杜门", "中门", "开门", "惊门", "生门", "景门"]
const DIPAN_SHEN = ["", "常", "符", "阴", "合", "", "天", "地", "蛇", "雀"]
const CHANGSHENG = ["长生", "沐浴", "冠带", "临官", "帝旺", "衰", "病", "死", "墓", "绝", "胎", "养"]

// 宫位对应地支
const PALACE_DIZHI: Record<number, string[]> = {
  1: ["子"], 2: ["丑", "未"], 3: ["卯"], 4: ["辰", "巳"], 5: [],
  6: ["戌", "亥"], 7: ["酉"], 8: ["丑", "寅"], 9: ["午"]
}

// 格局象意
const GEJU_MEANINGS: Record<string, string> = {
  "癸+己": "华盖地户。男女测之，音信皆阻，此格躲灾避难方为吉。得吉门尚可为之。",
  "戊+己": "青龙相合。主有财运，婚姻之喜，若门生宫及比合，则主百事吉，门克宫则好事成蹉跎，有始无终。",
  "惊+生": "主因女人生产或求财事惊忧，皆吉。",
  "丙+辛": "天狱。主官司败诉，有牢狱之灾。",
  "庚+庚": "太白同宫。主卜事多阻，不利经商，行人难归。",
}

// 生成九宫数据
function generatePalaceData(juNum: number, isYang: boolean, zhifuPalace: number, zhishiPalace: number) {
  const tiangan = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"]
  const offset = (juNum - 1) % 9
  const palaces: Record<number, {
    bashen: string; jiuxing: string; bamen: string
    tianGan: string; diGan: string; anGan: string
    dipanShen: string
    changsheng: { tian: string; di: string; an: string }
    isZhifu: boolean; isZhishi: boolean
    ruMu: boolean; jiXing: boolean; menPo: boolean
  }> = {}
  
  for (let i = 1; i <= 9; i++) {
    const idx = isYang ? (i + offset - 1) % 9 : (9 - i + offset) % 9
    const isZhifu = i === zhifuPalace
    const isZhishi = i === zhishiPalace
    const ruMu = [3, 6].includes(i)
    const jiXing = [4, 8].includes(i)
    const menPo = i === 2
    
    palaces[i] = {
      bashen: BASHEN[(idx % 9) + 1] || BASHEN[i],
      jiuxing: JIUXING[(idx % 9) + 1] || JIUXING[i],
      bamen: BAMEN[(idx % 9) + 1] || BAMEN[i],
      tianGan: tiangan[idx % 10],
      diGan: tiangan[(idx + 3) % 10],
      anGan: tiangan[(idx + 6) % 10],
      dipanShen: DIPAN_SHEN[i],
      changsheng: {
        tian: CHANGSHENG[(idx + juNum) % 12],
        di: CHANGSHENG[(idx + juNum + 4) % 12],
        an: CHANGSHENG[(idx + juNum + 8) % 12]
      },
      isZhifu, isZhishi, ruMu, jiXing, menPo
    }
  }
  return palaces
}

// ─── 宫位详情组件 ───
function PalaceDetail({ palace, data, onClose }: { 
  palace: number
  data: ReturnType<typeof generatePalaceData>[number]
  onClose: () => void 
}) {
  const xiantianGong = ["", "震", "艮", "坎", "巽", "", "离", "坤", "乾", "兑"]
  const dizhi = ["", "子", "丑未", "卯", "辰巳", "", "戌亥", "酉", "丑寅", "午"]
  const nums = (p: number) => [p, p + 2, p + 4, p + 6].filter(n => n <= 10).join("，")
  
  const combos = [
    { k: `${data.tianGan}+${data.diGan}`, l: `${data.tianGan}+${data.diGan}` },
    { k: `${data.tianGan}+${data.anGan}`, l: `${data.tianGan}+${data.anGan}` },
    { k: `${data.bamen.replace("门", "")}+${data.jiuxing.replace("天", "")}`, l: `${data.bamen}+${data.jiuxing}` },
  ]

  return (
    <div className="bg-card border-t border-border shadow-lg">
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-primary">{PALACE_NAMES[palace]}</h3>
          <button onClick={onClose} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-full transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <div className="text-sm text-foreground leading-relaxed bg-secondary/30 rounded-lg p-3">
          <span className="text-primary font-semibold">{PALACE_NAMES[palace]}</span>：
          先天宫为{xiantianGong[palace]}宫。取数：{nums(palace)}。地支：{dizhi[palace]}。
        </div>
        {combos.map((c, i) => (
          <div key={i} className="border-t border-border/50 pt-3">
            <span className="text-primary font-semibold">{c.l}</span>：
            <span className="text-sm text-foreground leading-relaxed">{GEJU_MEANINGS[c.k] || "此格局需结合用神具体分析。"}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── 主内容组件 ───
function QimenResultContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const matter = searchParams.get("matter") || ""
  const year = Number(searchParams.get("year")) || 2026
  const month = Number(searchParams.get("month")) || 5
  const day = Number(searchParams.get("day")) || 17
  const hour = Number(searchParams.get("hour")) || 13
  const minute = Number(searchParams.get("minute")) || 59
  const panMethod = searchParams.get("panMethod") || "fei"
  const flyMethod = searchParams.get("flyMethod") || "yinyang"
  const startMethod = searchParams.get("startMethod") || "zhirun"
  const anganMethod = searchParams.get("anganMethod") || "dipan"
  const customJu = searchParams.get("customJu") || ""
  
  // 状态
  const [showChangsheng, setShowChangsheng] = useState(false)
  const [showDipanShen, setShowDipanShen] = useState(false)
  const [selectedPalace, setSelectedPalace] = useState<number | null>(null)
  const [showNotes, setShowNotes] = useState(false)
  const [showEditMatter, setShowEditMatter] = useState(false)
  const [editedMatter, setEditedMatter] = useState(matter)
  const [selectedKongwang, setSelectedKongwang] = useState(3) // 默认选中时柱空亡
  
  // 局数
  const [currentJu, setCurrentJu] = useState(() => {
    if (customJu) {
      const m = customJu.match(/(阳遁|阴遁)(\d)局/)
      if (m) return { isYang: m[1] === "阳遁", num: parseInt(m[2]) }
    }
    return { isYang: true, num: 7 }
  })
  
  const zhifuPalace = 1
  const zhishiPalace = 6
  const palaceData = generatePalaceData(currentJu.num, currentJu.isYang, zhifuPalace, zhishiPalace)
  
  const prevJu = () => {
    setCurrentJu(p => p.num === 1 ? { isYang: !p.isYang, num: 9 } : { ...p, num: p.num - 1 })
    setSelectedPalace(null)
  }
  const nextJu = () => {
    setCurrentJu(p => p.num === 9 ? { isYang: !p.isYang, num: 1 } : { ...p, num: p.num + 1 })
    setSelectedPalace(null)
  }
  
  const panshi = `${panMethod === "fei" ? "飞盘" : "转盘"}奇门 - ${flyMethod === "yinyang" ? "阴阳皆顺" : "阳顺阴逆"} - ${startMethod === "zhirun" ? "置闰" : startMethod === "chaibu" ? "拆补" : startMethod === "maoshan" ? "茅山" : "自选"} - ${anganMethod === "dipan" ? "门地盘起" : "值使门起"}`
  
  const sizhu = { year: { g: "丙", z: "午" }, month: { g: "癸", z: "巳" }, day: { g: "辛", z: "卯" }, hour: { g: "乙", z: "未" } }
  const kongwangData = [
    { zhi: "寅卯", label: "年" },
    { zhi: "午未", label: "月" },
    { zhi: "午未", label: "日" },
    { zhi: "辰巳", label: "时" }
  ]
  const maXing = "巳"
  
  const selectedKongwangZhi = kongwangData[selectedKongwang]?.zhi || ""
  const hasKongwang = (palace: number) => {
    const dizhiList = PALACE_DIZHI[palace] || []
    return dizhiList.some(dz => selectedKongwangZhi.includes(dz))
  }
  const hasMaXing = (palace: number) => {
    const dizhiList = PALACE_DIZHI[palace] || []
    return dizhiList.includes(maXing)
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 h-11">
          <Link href="/paipan/qimen" className="p-1 -ml-1"><ChevronLeft className="w-6 h-6" /></Link>
          <h1 className="text-base font-bold">热卜奇门遁甲</h1>
          <button className="p-1 -mr-1 text-muted-foreground hover:text-primary"><Share2 className="w-5 h-5" /></button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-4">
        {/* 信息表格 - 精致卡���样式 */}
        <div className="px-3 pt-2 text-[13px]">
          <div className="bg-card rounded-xl border border-border/60 overflow-hidden shadow-sm">
            <table className="w-full border-collapse">
              <tbody>
                <tr className="border-b border-border/40">
                  <td className="py-2 px-3 text-primary font-medium w-16">事项</td>
                  <td className="py-2 px-2 flex items-center gap-2">
                    <span className="text-foreground flex-1">{editedMatter || "-"}</span>
                    <button onClick={() => setShowEditMatter(true)} className="p-1 text-muted-foreground hover:text-primary hover:bg-secondary/50 rounded transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                  </td>
                </tr>
                <tr className="border-b border-border/40">
                  <td className="py-2 px-3 text-primary font-medium">盘式</td>
                  <td className="py-2 px-2 text-foreground text-xs">{panshi}</td>
                </tr>
                <tr className="border-b border-border/40">
                  <td className="py-2 px-3 text-primary font-medium">日期</td>
                  <td className="py-2 px-2 text-foreground">{year}年{String(month).padStart(2,'0')}月{String(day).padStart(2,'0')}日 {hour}时{minute}分<span className="text-muted-foreground ml-1">(四月初一)</span></td>
                </tr>
                <tr className="border-b border-border/40">
                  <td className="py-2 px-3 text-primary font-medium">真太阳时</td>
                  <td className="py-2 px-2 text-foreground">{year}年{String(month).padStart(2,'0')}月{String(day).padStart(2,'0')}日 {hour}时{Math.max(0, minute - 15)}分</td>
                </tr>
                {/* 四柱 - 卡片式设计 */}
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
                            <span className="text-primary font-bold text-lg">{z.g}</span>
                            <br />
                            <span className="text-primary font-bold text-lg">{z.z}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </td>
                </tr>
                {/* 空亡 - 可选择卡片式 */}
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
                    <span className="text-primary font-medium">立夏</span> {year}.05.05 19:48 ~ <span className="text-primary font-medium">小满</span> {year}.05.21 08:36
                  </td>
                </tr>
                {/* 旬首/局数/值符/值使/马星 - 精致表格 */}
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
                      <span className="text-foreground font-medium">{startMethod === "zhirun" ? "置闰" : startMethod === "chaibu" ? "拆补" : startMethod === "maoshan" ? "茅山" : "自选"} {currentJu.isYang ? "阳" : "阴"}{currentJu.num}</span>
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

        {/* 九宫格 - 精致设计 */}
        <div className="px-3 py-2">
          <div className="border border-foreground/40 rounded-lg overflow-hidden bg-card shadow-sm">
            <div className="grid grid-cols-3">
              {PALACE_ORDER.map((palace) => {
                const d = palaceData[palace]
                const isSelected = selectedPalace === palace
                const isCenter = palace === 5
                const showKw = hasKongwang(palace)
                const showMa = hasMaXing(palace)
                
                return (
                  <div
                    key={palace}
                    onClick={() => setSelectedPalace(isSelected ? null : palace)}
                    className={`border-r border-b border-foreground/30 [&:nth-child(3n)]:border-r-0 [&:nth-child(n+7)]:border-b-0 h-[118px] cursor-pointer transition-all relative ${isSelected ? "bg-primary/10 ring-1 ring-inset ring-primary/30" : "hover:bg-secondary/30"} ${isCenter ? "bg-gradient-to-br from-amber-50/50 to-orange-50/30" : ""}`}
                  >
                    {/* 右上角马星 - 精致徽章样式 */}
                    {showMa && (
                      <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 text-[9px] text-white font-bold bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 rounded-sm shadow-md ring-1 ring-amber-600/20">马</span>
                    )}
                    
                    {/* 主信息布局 - 三列三行固定结构 */}
                    <div className="absolute inset-0 p-2 flex">
                      {/* 列1（最左固定宽度）：空亡圈、天干、地盘九神 - 垂直对齐 */}
                      <div className="flex flex-col justify-between w-4 shrink-0">
                        {/* 行1: 空亡圈 - 虚线样式 */}
                        <div className="h-[30px] flex items-center justify-center">
                          {showKw && <span className="w-3.5 h-3.5 rounded-full border-[1.5px] border-dashed border-primary" />}
                        </div>
                        {/* 行2: 天干(小) */}
                        <div className="h-[30px] flex items-center justify-center">
                          <span className="text-[11px] text-muted-foreground">{d.tianGan}</span>
                        </div>
                        {/* 行3: 地盘九神 */}
                        <div className="h-[30px] flex items-center justify-center">
                          {showDipanShen && <span className="text-[10px] text-muted-foreground animate-fade-in">{d.dipanShen}</span>}
                        </div>
                      </div>
                      
                      {/* 列2：八神、九星、八门 - 垂直左对齐 */}
                      <div className="flex flex-col justify-between flex-1 ml-1">
                        {/* 行1: 八神 */}
                        <div className="h-[30px] flex items-center">
                          <span className="text-[15px] font-medium text-foreground tracking-wide">{d.bashen}</span>
                        </div>
                        {/* 行2: 九星 */}
                        <div className="h-[30px] flex items-center">
                          <span className="text-[15px] font-medium text-foreground tracking-wide">{d.jiuxing}</span>
                        </div>
                        {/* 行3: 八门 */}
                        <div className="h-[30px] flex items-center">
                          <span className="text-[15px] font-medium text-foreground tracking-wide">{d.bamen}</span>
                        </div>
                      </div>
                      
                      {/* 列3（右侧）：空、长生+地干、长生+暗干 - 与九星八门横向对齐 */}
                      <div className="flex flex-col justify-between items-end">
                        {/* 行1: 空(与八神对齐) */}
                        <div className="h-[30px]" />
                        {/* 行2: 长生+地干(与九星横向对齐) */}
                        <div className="h-[30px] flex items-center justify-end gap-0.5">
                          {showChangsheng && d.changsheng.tian && <span className="text-[10px] text-muted-foreground animate-fade-in">{d.changsheng.tian.slice(0,2)}</span>}
                          <span className="text-[15px] text-foreground">{d.diGan}</span>
                        </div>
                        {/* 行3: 长生+暗干(与八门横向对齐) */}
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
          
          {/* 颜色说明 */}
          <div className="mt-1.5 text-[11px] text-center text-muted-foreground">
            颜色说明：<span className="text-green-600">符使</span>、<span className="text-orange-500">入墓</span>、<span className="text-blue-500">击刑</span>、<span className="text-pink-500">门迫</span>、<span className="text-purple-500">刑+墓</span>
          </div>
          
          {/* 操作按钮 - 精致样式 */}
          <div className="flex gap-2 mt-3">
            <button onClick={() => setShowChangsheng(!showChangsheng)} className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${showChangsheng ? "bg-primary text-white shadow-md" : "bg-card border border-border text-foreground hover:bg-secondary/50 hover:border-primary/30"}`}>长生状态</button>
            <button onClick={prevJu} className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-card border border-border text-foreground hover:bg-secondary/50 hover:border-primary/30 transition-all">上一局</button>
            <button onClick={nextJu} className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-card border border-border text-foreground hover:bg-secondary/50 hover:border-primary/30 transition-all">下一局</button>
            <button onClick={() => setShowDipanShen(!showDipanShen)} className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${showDipanShen ? "bg-primary text-white shadow-md" : "bg-card border border-border text-foreground hover:bg-secondary/50 hover:border-primary/30"}`}>地盘九神</button>
          </div>
          <div className="text-center text-[11px] text-muted-foreground mt-2">点击宫位查看详细信息</div>
        </div>

        {/* 宫位详情 */}
        {selectedPalace && <PalaceDetail palace={selectedPalace} data={palaceData[selectedPalace]} onClose={() => setSelectedPalace(null)} />}

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

      {/* 悬浮笔记按钮 - 精致设计 */}
      <div className="fixed right-4 bottom-6 z-10">
        <button onClick={() => setShowNotes(true)} className="w-12 h-12 bg-card rounded-full shadow-lg shadow-black/10 border border-border/80 flex flex-col items-center justify-center gap-0.5 hover:shadow-xl hover:scale-105 transition-all">
          <BookOpen className="w-4 h-4 text-primary" />
          <span className="text-[8px] text-primary font-medium">笔记</span>
        </button>
      </div>

      {/* 笔记面�� */}
      <QimenNotesPanel open={showNotes} onClose={() => setShowNotes(false)} />

      {/* 修改事项弹窗 */}
      {showEditMatter && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-6" onClick={() => setShowEditMatter(false)}>
          <div className="bg-card w-full max-w-sm rounded-2xl p-5" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">修改事项</h3>
            <input type="text" value={editedMatter} onChange={e => setEditedMatter(e.target.value)} placeholder="请输入事项" className="w-full px-4 py-3 rounded-xl border border-border bg-secondary/30 focus:outline-none focus:border-primary" />
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowEditMatter(false)} className="flex-1 py-2.5 rounded-full bg-secondary text-muted-foreground font-medium">取消</button>
              <button onClick={() => setShowEditMatter(false)} className="flex-1 py-2.5 rounded-full bg-primary text-white font-medium">确定</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function QimenResultPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>}>
      <QimenResultContent />
    </Suspense>
  )
}
