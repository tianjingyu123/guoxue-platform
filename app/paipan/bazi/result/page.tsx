"use client"

import { useState, useMemo, Suspense, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ChevronLeft, Share2, Pencil, ChevronDown, ChevronUp, Sparkles, BookOpen, X } from "lucide-react"
import { GANS, ZHIS, GAN_SHI_SHEN, ZHI_SHI_SHEN, ZHI_CANG_GAN, getGanZhi, generateLiuNian } from "@/lib/bazi-constants"
import { NotesPanel } from "@/components/paipan/bazi/notes-panel"
import { getMockData, calculateTool } from "@/lib/paipan-api/tools"
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

const wuxingBgColors: Record<string, string> = {
  "木": "bg-wuxing-wood/10 text-wuxing-wood", "火": "bg-wuxing-fire/10 text-wuxing-fire",
  "土": "bg-wuxing-earth/10 text-wuxing-earth", "金": "bg-wuxing-metal/10 text-wuxing-metal",
  "水": "bg-wuxing-water/10 text-wuxing-water",
}

// ─── 模拟数据 ───
const baziData = {
  name: "未知", gender: "男", zodiac: "猪", qianKun: "乾造", birthYear: 1983,
  solarDate: "1983年6月18日 14时31分", lunarDate: "五月初八",
  realSolarTime: "1983年06月18日 14时13分（北京 房山区）",
  jieQi: "芒种后12天0小时，夏至前3天17小时",
  siZhu: {
    year: { gan: "癸", zhi: "亥", shiShen: "杀", cangGan: [{ gan: "壬", shen: "官" }, { gan: "甲", shen: "印" }], naYin: "大海水", diShi: "胎", ziZuo: "帝旺", kongWang: "子丑" },
    month: { gan: "戊", zhi: "午", shiShen: "伤", cangGan: [{ gan: "丁", shen: "比" }, { gan: "己", shen: "食" }], naYin: "天上火", diShi: "临官", ziZuo: "帝旺", kongWang: "子丑" },
    day: { gan: "丁", zhi: "丑", shiShen: "日元", cangGan: [{ gan: "己", shen: "食" }, { gan: "癸", shen: "杀" }, { gan: "辛", shen: "才" }], naYin: "涧下水", diShi: "墓", ziZuo: "墓", kongWang: "申酉" },
    hour: { gan: "丁", zhi: "未", shiShen: "比", cangGan: [{ gan: "己", shen: "食" }, { gan: "丁", shen: "比" }, { gan: "乙", shen: "枭" }], naYin: "天河水", diShi: "冠带", ziZuo: "冠带", kongWang: "寅卯" },
  },
  shenSha: {
    year: ["驿马", "天德贵人", "禄神", "词馆"],
    month: ["禄神", "词馆", "阴差阳错"],
    day: ["阴差阳错", "华盖"],
    hour: ["华盖", "红艳", "天德贵人"],
  },
  taiYuan: { gan: "己", zhi: "酉", naYin: "大驿土" },
  mingGong: { gan: "丙", zhi: "辰", naYin: "沙中土" },
  shenGong: { gan: "甲", zhi: "寅", naYin: "大溪水" },
  qiYun: "出生后3年11个月29日起大运，每逢丁年6月16日前后交运。",
  daYun: [
    { year: 1983, gan: "戊", zhi: "午", shiShen: "伤", shiShenZhi: "劫", age: 0 },
    { year: 1987, gan: "丁", zhi: "巳", shiShen: "比", shiShenZhi: "枭", age: 4 },
    { year: 1997, gan: "丙", zhi: "辰", shiShen: "劫", shiShenZhi: "食", age: 14 },
    { year: 2007, gan: "乙", zhi: "卯", shiShen: "枭", shiShenZhi: "枭", age: 24 },
    { year: 2017, gan: "甲", zhi: "寅", shiShen: "印", shiShenZhi: "印", age: 34, active: true },
    { year: 2027, gan: "癸", zhi: "丑", shiShen: "杀", shiShenZhi: "食", age: 44 },
    { year: 2037, gan: "壬", zhi: "子", shiShen: "官", shiShenZhi: "官", age: 54 },
    { year: 2047, gan: "辛", zhi: "亥", shiShen: "才", shiShenZhi: "官", age: 64 },
    { year: 2057, gan: "庚", zhi: "戌", shiShen: "财", shiShenZhi: "伤", age: 74 },
    { year: 2067, gan: "己", zhi: "酉", shiShen: "食", shiShenZhi: "才", age: 84 },
  ],
  liuNian: [
    { year: 2018, gan: "戊", zhi: "戌", shiShen: "伤", shiShenZhi: "伤", age: 36 },
    { year: 2019, gan: "己", zhi: "亥", shiShen: "食", shiShenZhi: "官", age: 37 },
    { year: 2020, gan: "庚", zhi: "子", shiShen: "财", shiShenZhi: "官", age: 38 },
    { year: 2021, gan: "辛", zhi: "丑", shiShen: "才", shiShenZhi: "食", age: 39 },
    { year: 2022, gan: "壬", zhi: "寅", shiShen: "官", shiShenZhi: "印", age: 40 },
    { year: 2023, gan: "癸", zhi: "卯", shiShen: "杀", shiShenZhi: "枭", age: 41 },
    { year: 2024, gan: "甲", zhi: "辰", shiShen: "印", shiShenZhi: "食", age: 42 },
    { year: 2025, gan: "乙", zhi: "巳", shiShen: "枭", shiShenZhi: "枭", age: 43 },
    { year: 2026, gan: "丙", zhi: "午", shiShen: "劫", shiShenZhi: "劫", age: 44, active: true },
    { year: 2027, gan: "丁", zhi: "未", shiShen: "比", shiShenZhi: "食", age: 45 },
  ],
  relations: {
    tianGan: ["丙辛合", "戊癸合化火"],
    diZhi: ["亥卯未三合", "巳午未三会", "丑未冲", "午午刑", "寅巳害"],
    zhengZhu: ["己亥冲", "寅亥合", "午丑害"],
  },
  wuxingState: { 木: "旺", 火: "相", 土: "休", 金: "囚", 水: "死" } as Record<string, string>,
}

const classics = [
  { id: "qiong", name: "穷通宝鉴" },
  { id: "di", name: "滴天髓" },
  { id: "san", name: "三命通会" },
  { id: "bazi", name: "八字提要" },
]

const COLS = ["year", "month", "day", "hour"] as const
const COL_NAMES = ["年柱", "月柱", "日柱", "时柱"]

// ─── 区块标题 ───
function SectionTitle({ children, extra }: { children: React.ReactNode; extra?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-3 py-2">
      <div className="flex items-center gap-1.5">
        <div className="w-0.5 h-3.5 bg-primary rounded-full" />
        <span className="text-sm font-semibold text-foreground">{children}</span>
      </div>
      {extra}
    </div>
  )
}

// ─── 古籍书封组件 ───
function BookCover({ name, selected }: { name: string; selected: boolean }) {
  return (
    <div className={`relative w-[68px] h-[92px] rounded-sm overflow-hidden shadow transition-shadow ${selected ? "ring-2 ring-primary shadow-md" : "shadow-sm"}`}>
      <div className="absolute inset-0 bg-gradient-to-b from-amber-100 via-amber-50 to-amber-100" />
      <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(120,80,40,0.3) 3px, rgba(120,80,40,0.3) 3.5px)" }} />
      <div className="absolute left-0 top-0 bottom-0 w-3 bg-gradient-to-r from-amber-200/80 to-transparent border-r border-amber-300/40" />
      <div className="absolute left-[4px] top-[14%] w-1 h-1 rounded-full bg-amber-400/50" />
      <div className="absolute left-[4px] top-[46%] w-1 h-1 rounded-full bg-amber-400/50" />
      <div className="absolute left-[4px] top-[78%] w-1 h-1 rounded-full bg-amber-400/50" />
      <div className="absolute left-[14px] right-[6px] top-[10px] bottom-[10px] border border-amber-400/40 rounded-[1px] flex items-center justify-center">
        <span className="text-primary font-bold text-[11px] tracking-wide" style={{ writingMode: "vertical-rl" }}>{name}</span>
      </div>
    </div>
  )
}

// ─── 古籍内容数据 ───
const classicsContent: Record<string, { title: string; original: string; translation: string }> = {
  qiong: {
    title: "\u8BBA\u4E01\u751F\u5348\u6708",
    original: "\u4E94\u6708\u4E01\u706B\u5EFA\u7984\uFF0C\u6B63\u503C\u706B\u65FA\u4E4B\u65F6\uFF0C\u706B\u5F53\u4EE4\u800C\u65FA\uFF0C\u4EE5\u91D1\u6C34\u4E3A\u7528\u795E\u4E3A\u5B9C\u3002\u7528\u58EC\u4E0D\u53EF\u5C11\u7532\uFF0C\u6700\u4E3A\u7D27\u8981\u3002\u4E19\u4E01\u5E76\u900F\uFF0C\u53C8\u52A0\u652F\u4E2D\u706B\u591A\uFF0C\u65E0\u58EC\u6C34\u5236\u4E4B\uFF0C\u5176\u4EBA\u5FC5\u64CD\u5C60\u5BB0\u4E1A\u3002\u7528\u58EC\u8005\uFF0C\u91D1\u59BB\u6C34\u5B50\u3002\u82E5\u5F97\u5E9A\u8F9B\u58EC\u4E09\u8005\u9F50\u900F\uFF0C\u79D1\u7532\u529F\u540D\u3002",
    translation: "\u4E94\u6708\u4E01\u706B\u5904\u4E8E\u5EFA\u7984\u4E4B\u4F4D\uFF0C\u6B63\u503C\u706B\u52BF\u6700\u65FA\u7684\u65F6\u5019\uFF0C\u706B\u5728\u5F53\u4EE4\u4E4B\u65F6\u975E\u5E38\u65FA\u76DB\uFF0C\u5E94\u8BE5\u4EE5\u91D1\u6C34\u4F5C\u4E3A\u7528\u795E\u3002\u4F7F\u7528\u58EC\u6C34\u65F6\u4E0D\u80FD\u7F3A\u5C11\u7532\u6728\u7684\u914D\u5408\uFF0C\u8FD9\u662F\u6700\u5173\u952E\u7684\u8981\u70B9\u3002\u5982\u679C\u4E19\u4E01\u90FD\u900F\u51FA\u5929\u5E72\uFF0C\u518D\u52A0\u4E0A\u5730\u652F\u706B\u591A\uFF0C\u6CA1\u6709\u58EC\u6C34\u6765\u5236\u7EA6\uFF0C\u6B64\u4EBA\u5FC5\u5B9A\u4ECE\u4E8B\u5C60\u5BB0\u884C\u4E1A\u3002\u7528\u58EC\u6C34\u4E3A\u7528\u795E\u7684\uFF0C\u5A36\u91D1\u547D\u4E4B\u59BB\u3001\u751F\u6C34\u547D\u4E4B\u5B50\u3002\u82E5\u5E9A\u8F9B\u58EC\u4E09\u8005\u90FD\u900F\u51FA\u5929\u5E72\uFF0C\u53EF\u5F97\u79D1\u4E3E\u529F\u540D\u3002",
  },
  di: {
    title: "\u8BBA\u4E01\u706B",
    original: "\u4E01\u706B\u67D4\u4E2D\uFF0C\u5185\u6027\u662D\u878D\u3002\u62B1\u4E59\u800C\u5B5D\uFF0C\u5408\u58EC\u800C\u5FE0\u3002\u65FA\u800C\u4E0D\u70C8\uFF0C\u8870\u800C\u4E0D\u7A77\u3002\u5982\u6709\u5AB5\u6BCD\uFF0C\u53EF\u79CB\u53EF\u51AC\u3002",
    translation: "\u4E01\u706B\u5C5E\u9634\uFF0C\u6027\u8D28\u67D4\u548C\u800C\u5185\u5728\u5149\u660E\u901A\u8FBE\u3002\u4E0E\u4E59\u6728\u76F8\u4F9D\u662F\u6148\u5B5D\u4E4B\u8C61\uFF0C\u4E0E\u58EC\u6C34\u76F8\u5408\u662F\u5FE0\u4E49\u4E4B\u5F81\u3002\u4E01\u706B\u65FA\u76DB\u65F6\u4E0D\u4F1A\u8FC7\u4E8E\u731B\u70C8\uFF0C\u8870\u5F31\u65F6\u4E5F\u4E0D\u4F1A\u8D70\u6295\u65E0\u8DEF\u3002\u5982\u679C\u547D\u4E2D\u6709\u7532\u6728\u6B63\u5370\u6765\u751F\u52A9\uFF0C\u5373\u4F7F\u5728\u79CB\u51AC\u5931\u4EE4\u4E4B\u65F6\u4E5F\u80FD\u81EA\u7ACB\u3002\u4E01\u706B\u72B9\u5982\u706F\u70DB\u4E4B\u5149\uFF0C\u867D\u5C0F\u800C\u80FD\u7167\u4EAE\u56DB\u65B9\u3002",
  },
  san: {
    title: "\u4E01\u4E11\u65E5\u67F1\u8BBA",
    original: "\u4E01\u4E11\u5750\u5893\u5E93\uFF0C\u4E3A\u91D1\u795E\u683C\u5C40\u3002\u4E01\u706B\u5750\u4E11\u4E2D\u5DF1\u571F\u98DF\u795E\u3001\u8F9B\u91D1\u504F\u8D22\u3001\u7678\u6C34\u4E03\u6740\u3002\u82E5\u8EAB\u65FA\u80FD\u4EFB\u8D22\u6740\uFF0C\u4E3B\u5BCC\u8D35\u3002\u4E01\u706B\u65E5\u4E3B\u5750\u5893\u5730\uFF0C\u9022\u51B2\u5219\u53D1\u3002\u4E11\u4E2D\u6697\u85CF\u4E09\u5947\uFF1A\u5DF1\u8F9B\u7678\uFF0C\u98DF\u795E\u751F\u504F\u8D22\uFF0C\u504F\u8D22\u5F15\u4E03\u6740\uFF0C\u4E00\u8DEF\u987A\u751F\u6709\u60C5\u3002",
    translation: "\u4E01\u4E11\u65E5\u67F1\u662F\u4E01\u706B\u5750\u5728\u5893\u5E93\u4E4B\u4E0A\uFF0C\u5C5E\u4E8E\u91D1\u795E\u683C\u5C40\u3002\u4E11\u571F\u4E2D\u6697\u85CF\u5DF1\u571F\uFF08\u98DF\u795E\uFF09\u3001\u8F9B\u91D1\uFF08\u504F\u8D22\uFF09\u3001\u7678\u6C34\uFF08\u4E03\u6740\uFF09\u3002\u5982\u679C\u65E5\u4E3B\u8EAB\u65FA\u80FD\u591F\u627F\u62C5\u8D22\u6740\uFF0C\u4E3B\u4EBA\u5BCC\u8D35\u3002\u4E01\u706B\u65E5\u4E3B\u5750\u5728\u5893\u5730\uFF0C\u9047\u5230\u51B2\u51FB\u5C31\u4F1A\u53D1\u8FBE\u3002\u4E11\u571F\u4E2D\u6697\u85CF\u98DF\u795E\u3001\u504F\u8D22\u3001\u4E03\u6740\u4E09\u79CD\u5143\u7D20\uFF0C\u98DF\u795E\u751F\u504F\u8D22\u3001\u504F\u8D22\u5F15\u4E03\u6740\uFF0C\u5F62\u6210\u4E00\u8DEF\u987A\u751F\u7684\u6709\u60C5\u7EC4\u5408\u3002",
  },
  bazi: {
    title: "\u4E94\u6708\u63D0\u8981\uFF08\u5348\u6708\uFF09",
    original: "\u5348\u6708\u4E01\u706B\u5EFA\u7984\uFF0C\u706B\u52BF\u708E\u4E0A\u3002\u5B9C\u58EC\u6C34\u9AD8\u900F\u4EE5\u5236\u706B\uFF0C\u5E9A\u91D1\u4F50\u4E4B\u53D1\u6C34\u6E90\u3002\u7532\u6728\u4E0D\u53EF\u5C11\uFF0C\u5F15\u4E01\u6210\u6587\u660E\u4E4B\u8C61\u3002\u5348\u6708\u706B\u65FA\u571F\u71E5\uFF0C\u91D1\u6C34\u4E3A\u8C03\u5019\u6025\u9700\u3002\u82E5\u58EC\u7532\u4E24\u900F\uFF0C\u5B9A\u4E3B\u79D1\u7532\u3002\u58EC\u900F\u7532\u85CF\uFF0C\u4EA6\u53EF\u529F\u540D\u3002\u65E0\u58EC\u7528\u7678\uFF0C\u683C\u5C40\u7A0D\u6B21\u3002",
    translation: "\u5348\u6708\u4E01\u706B\u6B63\u5F53\u5EFA\u7984\u4E4B\u65F6\uFF0C\u706B\u52BF\u6781\u4E3A\u65FA\u76DB\u5411\u4E0A\u3002\u9002\u5B9C\u58EC\u6C34\u5728\u5929\u5E72\u9AD8\u900F\u6765\u5236\u7EA6\u706B\u52BF\uFF0C\u5E9A\u91D1\u8F85\u52A9\u58EC\u6C34\u4EE5\u53D1\u5176\u6E90\u5934\u3002\u7532\u6728\u4E0D\u53EF\u7F3A\u5C11\uFF0C\u5F15\u5BFC\u4E01\u706B\u6210\u4E3A\u6587\u660E\u4E4B\u8C61\u3002\u5348\u6708\u706B\u65FA\u571F\u71E5\uFF0C\u91D1\u6C34\u662F\u8C03\u5019\u7684\u6025\u5207\u9700\u8981\u3002\u5982\u679C\u58EC\u6C34\u548C\u7532\u6728\u90FD\u900F\u51FA\u5929\u5E72\uFF0C\u5FC5\u5B9A\u4E3B\u79D1\u4E3E\u529F\u540D\u3002\u58EC\u6C34\u900F\u51FA\u800C\u7532\u6728\u6697\u85CF\u5728\u5730\u652F\uFF0C\u4E5F\u53EF\u4EE5\u53D6\u5F97\u529F\u540D\u3002\u6CA1\u6709\u58EC\u6C34\u800C\u7528\u7678\u6C34\u4EE3\u66FF\uFF0C\u683C\u5C40\u7A0D\u5DEE\u4E00\u4E9B\u3002",
  },
}

// ─── 古籍参考组件 ───
function ClassicsSection({ selectedClassic, setSelectedClassic, classicMode, setClassicMode }: {
  selectedClassic: string | null
  setSelectedClassic: (v: string | null) => void
  classicMode: "\u539F\u6587" | "\u8BD1\u6587" | "\u5BF9\u7167"
  setClassicMode: (v: "\u539F\u6587" | "\u8BD1\u6587" | "\u5BF9\u7167") => void
}) {
  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      <SectionTitle extra={<span className="text-xs text-primary cursor-pointer">{"更多古籍"}</span>}>{"古籍参考"}</SectionTitle>
      <div className="grid grid-cols-4 gap-3 px-3 pb-3">
        {classics.map((b) => (
          <button key={b.id} onClick={() => setSelectedClassic(selectedClassic === b.id ? null : b.id)} className="flex flex-col items-center gap-1">
            <BookCover name={b.name} selected={selectedClassic === b.id} />
            <span className={`text-xs leading-tight ${selectedClassic === b.id ? "text-primary font-semibold" : "text-muted-foreground"}`}>{b.name}</span>
          </button>
        ))}
      </div>
      {selectedClassic && classicsContent[selectedClassic] && (
        <div className="border-t border-border p-3 bg-secondary/30">
          <div className="flex gap-2 mb-2.5">
            {(["\u539F\u6587", "\u8BD1\u6587", "\u5BF9\u7167"] as const).map((m) => (
              <button key={m} onClick={() => setClassicMode(m)} className={`px-3 py-1 text-xs rounded-full transition-colors ${classicMode === m ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground border border-border"}`}>{m}</button>
            ))}
          </div>
          <div className="bg-card rounded-lg p-3 border border-border">
            <p className="text-sm font-semibold text-foreground mb-1.5">{classicsContent[selectedClassic].title}</p>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
              {classicMode === "\u539F\u6587" && classicsContent[selectedClassic].original}
              {classicMode === "\u8BD1\u6587" && classicsContent[selectedClassic].translation}
              {classicMode === "\u5BF9\u7167" && (
                <>
                  <span className="text-foreground font-medium">{"【原文】"}</span>
                  {classicsContent[selectedClassic].original}
                  {"\n\n"}
                  <span className="text-primary font-medium">{"【译文】"}</span>
                  {classicsContent[selectedClassic].translation}
                </>
              )}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── 主页面 ───
function BaziResultContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeMode, setActiveMode] = useState<"traditional" | "analysis">("traditional")
  const [showEditModal, setShowEditModal] = useState(false)
  const [showNotes, setShowNotes] = useState(false)

  const userInput = useMemo(() => ({
    name: searchParams.get("name") || baziData.name,
    gender: searchParams.get("gender") || baziData.gender,
    year: Number(searchParams.get("year")) || 1983,
    month: Number(searchParams.get("month")) || 6,
    day: Number(searchParams.get("day")) || 18,
    hour: Number(searchParams.get("hour")) || 14,
    minute: Number(searchParams.get("minute")) || 31,
    province: searchParams.get("province") || "",
    city: searchParams.get("city") || "\u5317\u4EAC",
    district: searchParams.get("district") || "\u623F\u5C71\u533A",
  }), [searchParams])

  const data = useMemo(() => ({
    ...baziData,
    name: userInput.name,
    gender: userInput.gender,
    qianKun: userInput.gender === "\u5973" ? "\u5764\u9020" : "\u4E7E\u9020",
    solarDate: `${userInput.year}\u5E74${userInput.month}\u6708${userInput.day}\u65E5 ${String(userInput.hour).padStart(2, '0')}\u65F6${String(userInput.minute).padStart(2, '0')}\u5206`,
    birthYear: userInput.year,
  }), [userInput])

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-card border-b border-border sticky top-0 z-20">
        <div className="flex items-center justify-between px-3 py-2.5">
          <button onClick={() => router.back()} className="text-muted-foreground"><ChevronLeft className="w-5 h-5" /></button>
<h1 className="text-base font-bold text-foreground">{"热卜八字"}</h1>
  <div className="flex items-center gap-1">
  <button onClick={() => setShowNotes(true)} className="p-1 text-muted-foreground hover:text-foreground" title="笔记"><BookOpen className="w-[18px] h-[18px]" /></button>
  <button className="p-1 text-muted-foreground hover:text-foreground"><Share2 className="w-[18px] h-[18px]" /></button>
  </div>
        </div>
        <div className="flex">
          {[{ key: "traditional" as const, label: "\u4F20\u7EDF\u6A21\u5F0F" }, { key: "analysis" as const, label: "\u5206\u6790\u6A21\u5F0F" }].map((m) => (
            <button key={m.key} onClick={() => setActiveMode(m.key)} className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeMode === m.key ? "text-primary border-primary" : "text-muted-foreground border-transparent"}`}>{m.label}</button>
          ))}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        {activeMode === "traditional" ? (
          <TraditionalMode data={data} onEdit={() => setShowEditModal(true)} />
        ) : (
          <AnalysisMode data={data} onEdit={() => setShowEditModal(true)} />
        )}
        {/* 合规免责声明（两种模式均展示） */}
        <div className="px-2.5 pb-4">
          <Disclaimer variant="fortune" tone="card" />
        </div>
      </main>

      {/* 悬浮笔记按钮 */}
      <div className="fixed right-3 bottom-5 z-10">
        <button onClick={() => setShowNotes(true)} className="w-11 h-11 bg-card rounded-full shadow-lg border border-border flex flex-col items-center justify-center gap-0.5 hover:shadow-xl transition-shadow">
          <BookOpen className="w-4 h-4 text-primary" />
          <span className="text-[9px] text-primary font-medium">{"\u7B14\u8BB0"}</span>
        </button>
      </div>

      {/* 断事笔记面板 */}
      <NotesPanel open={showNotes} onClose={() => setShowNotes(false)} />

      {showEditModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end" onClick={() => setShowEditModal(false)}>
          <div className="bg-card w-full rounded-t-2xl p-5 pb-8 max-h-[80vh] overflow-y-auto animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-5">
              <span className="text-lg font-bold text-foreground">{"修改信息"}</span>
              <button onClick={() => setShowEditModal(false)} className="w-7 h-7 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="divide-y divide-border">
              {/* 客��名称 */}
              <div className="flex items-center justify-between py-4">
                <span className="text-sm font-semibold text-foreground shrink-0">客户名称</span>
                <input
                  type="text"
                  defaultValue={userInput.name || ""}
                  placeholder="请输入名称"
                  id="edit-name"
                  className="text-right text-sm text-muted-foreground placeholder:text-muted-foreground/50 bg-transparent focus:outline-none focus:text-foreground w-40"
                />
              </div>

              {/* 选择性别 */}
              <div className="flex items-center justify-between py-4">
                <span className="text-sm font-semibold text-foreground shrink-0">选择性别</span>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="radio" name="edit-gender" value="男" defaultChecked={userInput.gender === "男"} className="w-4.5 h-4.5 accent-primary" />
                    <span className="text-sm text-foreground">男</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="radio" name="edit-gender" value="女" defaultChecked={userInput.gender === "女"} className="w-4.5 h-4.5 accent-primary" />
                    <span className="text-sm text-foreground">女</span>
                  </label>
                </div>
              </div>

              {/* 出生时间 */}
              <div className="py-4">
                <span className="text-sm font-semibold text-foreground block mb-2">出生时间</span>
                <div className="grid grid-cols-5 gap-2">
                  <div>
                    <label className="text-[10px] text-muted-foreground">年</label>
                    <input type="number" id="edit-year" defaultValue={userInput.year} min="1900" max="2100" className="w-full bg-secondary/30 rounded-lg px-2 py-1.5 text-sm text-foreground text-center border border-border focus:outline-none focus:border-primary/50" />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground">月</label>
                    <input type="number" id="edit-month" defaultValue={userInput.month} min="1" max="12" className="w-full bg-secondary/30 rounded-lg px-2 py-1.5 text-sm text-foreground text-center border border-border focus:outline-none focus:border-primary/50" />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground">日</label>
                    <input type="number" id="edit-day" defaultValue={userInput.day} min="1" max="31" className="w-full bg-secondary/30 rounded-lg px-2 py-1.5 text-sm text-foreground text-center border border-border focus:outline-none focus:border-primary/50" />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground">时</label>
                    <input type="number" id="edit-hour" defaultValue={userInput.hour} min="0" max="23" className="w-full bg-secondary/30 rounded-lg px-2 py-1.5 text-sm text-foreground text-center border border-border focus:outline-none focus:border-primary/50" />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground">分</label>
                    <input type="number" id="edit-minute" defaultValue={userInput.minute} min="0" max="59" className="w-full bg-secondary/30 rounded-lg px-2 py-1.5 text-sm text-foreground text-center border border-border focus:outline-none focus:border-primary/50" />
                  </div>
                </div>
              </div>

              {/* 出生地点 */}
              <div className="py-4">
                <span className="text-sm font-semibold text-foreground block mb-2">出生地点</span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-muted-foreground">城市</label>
                    <input type="text" id="edit-city" defaultValue={userInput.city} placeholder="如：北京" className="w-full bg-secondary/30 rounded-lg px-3 py-1.5 text-sm text-foreground border border-border focus:outline-none focus:border-primary/50" />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground">区县</label>
                    <input type="text" id="edit-district" defaultValue={userInput.district} placeholder="如：房山区" className="w-full bg-secondary/30 rounded-lg px-3 py-1.5 text-sm text-foreground border border-border focus:outline-none focus:border-primary/50" />
                  </div>
                </div>
              </div>
            </div>

            {/* 时间选项 */}
            <div className="flex items-center gap-5 mt-4 mb-6">
              {["真太阳时", "早晚子时", "夏令时"].map((opt, i) => (
                <label key={opt} className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" defaultChecked={i === 0} className="w-4 h-4 accent-primary rounded" />
                  <span className="text-sm text-foreground">{opt}</span>
                </label>
              ))}
            </div>

            {/* 确定按钮 */}
            <button
              onClick={() => {
                const val = (id: string) => (document.getElementById(id) as HTMLInputElement)?.value || ""
                const genderEl = document.querySelector("input[name='edit-gender']:checked") as HTMLInputElement
                const params = new URLSearchParams()
                params.set("name", val("edit-name") || userInput.name)
                params.set("gender", genderEl?.value || userInput.gender)
                params.set("year", val("edit-year") || String(userInput.year))
                params.set("month", val("edit-month") || String(userInput.month))
                params.set("day", val("edit-day") || String(userInput.day))
                params.set("hour", val("edit-hour") || String(userInput.hour))
                params.set("minute", val("edit-minute") || String(userInput.minute))
                params.set("city", val("edit-city") || userInput.city)
                params.set("district", val("edit-district") || userInput.district)
                router.replace(`/paipan/bazi/result?${params.toString()}`)
                setShowEditModal(false)
              }}
              className="w-full py-3.5 bg-primary text-primary-foreground rounded-xl font-semibold text-base hover:opacity-90 transition-opacity"
            >
              {"确定"}
            </button>
          </div>
        </div>
      )}

    </div>
  )
}

export default function BaziResultPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><span className="text-muted-foreground">{"加载中..."}</span></div>}>
      <BaziResultContent />
    </Suspense>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 传统模式
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function TraditionalMode({ data, onEdit }: { data: typeof baziData; onEdit: () => void }) {
  const [showAllShenSha, setShowAllShenSha] = useState(false)
  const [expandedDaYun, setExpandedDaYun] = useState<number | null>(null)
  const [selectedClassic, setSelectedClassic] = useState<string | null>(null)
  const [classicMode, setClassicMode] = useState<"原文" | "译文" | "对照">("原文")

  return (
    <div className="p-2.5 space-y-2">

      {/* 基本信息 */}
      <div className="bg-card rounded-lg border border-border">
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
          <div className="flex items-center gap-4 text-sm text-foreground">
            <span><span className="text-primary font-medium">名称：</span>{data.name}</span>
            <span><span className="text-primary font-medium">性别：</span>{data.gender}</span>
            <span><span className="text-primary font-medium">生肖：</span>{data.zodiac}</span>
          </div>
        </div>
        <div className="px-3 py-2 text-sm flex items-center gap-2 border-b border-border">
          <span className="text-primary font-medium shrink-0">日期</span>
          <span className="text-foreground">{data.solarDate}（{data.lunarDate}）</span>
          <button onClick={onEdit} className="ml-auto p-0.5 text-muted-foreground hover:text-primary transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
        </div>
        <div className="px-3 py-2 text-sm flex gap-2 border-b border-border">
          <span className="text-primary font-medium shrink-0">真太阳时</span>
          <span className="text-muted-foreground">{data.realSolarTime}</span>
        </div>
        <div className="px-3 py-2 text-sm flex gap-2">
          <span className="text-primary font-medium shrink-0">节气</span>
          <span className="text-muted-foreground">{data.jieQi}</span>
        </div>
      </div>

      {/* 四柱主表 */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <table className="w-full text-center">
          <thead>
            <tr className="bg-primary/5">
              <th className="py-2 w-[52px] text-sm font-semibold text-primary">四柱</th>
              {COL_NAMES.map((n, i) => (
                <th key={i} className={`py-2 text-sm font-semibold ${i === 2 ? "text-primary" : "text-foreground"}`}>{n}</th>
              ))}
            </tr>
          </thead>
          <tbody className="text-sm">
            {/* 十神 */}
            <tr className="border-t border-border">
              <td className="py-1.5 text-primary font-medium">十神</td>
              {COLS.map((k) => <td key={k} className="py-1.5 text-muted-foreground">{data.siZhu[k].shiShen}</td>)}
            </tr>
            {/* 天干地支 */}
            <tr className="bg-secondary/20">
              <td className="py-3 text-primary font-medium">{data.qianKun}</td>
              {COLS.map((k) => (
                <td key={k} className="py-3">
                  <span className={`text-2xl font-black block leading-tight ${wuxingColors[data.siZhu[k].gan]}`}>{data.siZhu[k].gan}</span>
                  <span className={`text-2xl font-black block leading-tight ${wuxingColors[data.siZhu[k].zhi]}`}>{data.siZhu[k].zhi}</span>
                </td>
              ))}
            </tr>
            {/* 藏���+十神 */}
            <tr className="border-t border-border">
              <td className="py-1.5 text-primary font-medium align-top">藏干</td>
              {COLS.map((k) => (
                <td key={k} className="py-1.5 align-top">
                  <div className="flex justify-center gap-0.5">
                    {data.siZhu[k].cangGan.map((c, i) => (
                      <span key={i} className={`font-bold ${wuxingColors[c.gan]}`}>{c.gan}</span>
                    ))}
                  </div>
                  <div className="flex justify-center gap-0.5 text-[9px] text-muted-foreground mt-px">
                    {data.siZhu[k].cangGan.map((c, i) => (
                      <span key={i}>{c.shen}</span>
                    ))}
                  </div>
                </td>
              ))}
            </tr>
            {/* 纳音/地势/自坐/空亡 */}
            {([
              { label: "纳音", key: "naYin" },
              { label: "地势", key: "diShi" },
              { label: "自坐", key: "ziZuo" },
              { label: "空亡", key: "kongWang" },
            ] as const).map((row) => (
              <tr key={row.label} className="border-t border-border">
                <td className="py-1.5 text-primary font-medium">{row.label}</td>
                {COLS.map((k) => <td key={k} className="py-1.5 text-muted-foreground">{data.siZhu[k][row.key]}</td>)}
              </tr>
            ))}
            {/* 神煞 */}
            <tr className="border-t border-border">
              <td className="py-1.5 text-primary font-medium">神煞</td>
              {COLS.map((k) => {
                const all = data.shenSha[k]
                return <td key={k} className="py-1.5 text-muted-foreground text-xs align-top">{all.slice(0, 2).join("、")}{all.length > 2 && "..."}</td>
              })}
            </tr>
          </tbody>
        </table>
        <button onClick={() => setShowAllShenSha(!showAllShenSha)} className="w-full py-2 border-t border-border flex items-center justify-center gap-1 text-xs text-primary hover:bg-primary/5 transition-colors">
          {showAllShenSha ? "收起神煞" : "展开全部神煞"}
          {showAllShenSha ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
        {showAllShenSha && (
          <div className="border-t border-border bg-secondary/20 px-3 py-2.5">
            <div className="grid grid-cols-4 gap-x-2 gap-y-1">
              {COLS.map((k, ci) => (
                <div key={k} className="text-center">
                  <div className="text-primary text-xs font-semibold mb-1">{COL_NAMES[ci]}</div>
                  {data.shenSha[k].map((s, si) => (
                    <div key={si} className="text-muted-foreground text-xs leading-relaxed">{s}</div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 胎元/命宫/身宫 */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <table className="w-full text-center">
          <thead>
            <tr className="bg-primary/5 text-sm">
              <th className="py-2 font-semibold text-foreground">胎元</th>
              <th className="py-2 font-semibold text-foreground">命宫</th>
              <th className="py-2 font-semibold text-foreground">身宫</th>
              <th className="py-2 font-semibold text-foreground">旺相休囚死</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              {[data.taiYuan, data.mingGong, data.shenGong].map((g, i) => (
                <td key={i} className="py-2">
                  <span className={`text-lg font-black ${wuxingColors[g.gan]}`}>{g.gan}</span>
                  <span className={`text-lg font-black ${wuxingColors[g.zhi]}`}>{g.zhi}</span>
                </td>
              ))}
              <td className="py-2">
                <div className="flex flex-wrap justify-center gap-1">
                  {Object.entries(data.wuxingState).map(([el, st]) => (
                    <span key={el} className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold ${wuxingBgColors[el]}`}>{el}{st}</span>
                  ))}
                </div>
              </td>
            </tr>
            <tr className="text-xs text-muted-foreground border-t border-border">
              <td className="py-1">{data.taiYuan.naYin}</td>
              <td className="py-1">{data.mingGong.naYin}</td>
              <td className="py-1">{data.shenGong.naYin}</td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 起运 */}
      <div className="bg-card rounded-lg border border-border px-3 py-2.5 text-sm text-muted-foreground">{data.qiYun}</div>

      {/* 大运 */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <SectionTitle extra={<span className="text-xs text-muted-foreground">点击展开流年</span>}>大运</SectionTitle>
        <table className="w-full text-center">
          <tbody>
            <tr className="text-[11px] text-muted-foreground">
              {data.daYun.map((d, i) => <td key={i} className="pt-1">{d.year}</td>)}
            </tr>
            <tr>
              {data.daYun.map((d, i) => (
                <td key={i} className={`cursor-pointer transition-colors ${d.active ? "bg-primary/8" : expandedDaYun === i ? "bg-secondary" : ""}`} onClick={() => setExpandedDaYun(expandedDaYun === i ? null : i)}>
                  <span className={`text-xl font-black leading-none ${wuxingColors[d.gan]}`}>{d.gan}</span><span className="text-[9px] text-muted-foreground align-top ml-px">{d.shiShen}</span>
                </td>
              ))}
            </tr>
            <tr>
              {data.daYun.map((d, i) => (
                <td key={i} className={`cursor-pointer transition-colors ${d.active ? "bg-primary/8" : expandedDaYun === i ? "bg-secondary" : ""}`} onClick={() => setExpandedDaYun(expandedDaYun === i ? null : i)}>
                  <span className={`text-xl font-black leading-none ${wuxingColors[d.zhi]}`}>{d.zhi}</span><span className="text-[9px] text-muted-foreground align-top ml-px">{d.shiShenZhi}</span>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
        {expandedDaYun !== null && (
          <div className="border-t border-border p-2.5 bg-secondary/30">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-foreground font-medium">{data.daYun[expandedDaYun].year}-{data.daYun[expandedDaYun].year + 9} 流年</span>
              <button onClick={() => setExpandedDaYun(null)} className="text-xs text-primary">收起</button>
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {Array.from({ length: 10 }, (_, i) => {
                const y = data.daYun[expandedDaYun].year + i
                const { gan: g, zhi: z } = getGanZhi(y)
                const age = y - (data.birthYear || 1983)
                return (
                  <div key={i} className="bg-card rounded p-1.5 text-center border border-border">
                    <div className="text-[10px] text-muted-foreground">{y}</div>
                    <div>
                      <span className={`text-base font-bold ${wuxingColors[g]}`}>{g}</span>
                      <span className="text-[9px] text-muted-foreground align-top ml-px">{GAN_SHI_SHEN[g]}</span>
                    </div>
                    <div>
                      <span className={`text-base font-bold ${wuxingColors[z]}`}>{z}</span>
                      <span className="text-[9px] text-muted-foreground align-top ml-px">{ZHI_SHI_SHEN[z]}</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">{age}岁</div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* 流年 */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <SectionTitle>流年</SectionTitle>
        <table className="w-full text-center">
          <tbody>
            <tr className="text-[11px] text-muted-foreground">
              {data.liuNian.map((n, i) => <td key={i} className="pt-1">{n.year}</td>)}
            </tr>
            <tr>
              {data.liuNian.map((n, i) => (
                <td key={i} className={`${n.active ? "bg-primary/8" : ""}`}>
                  <span className={`text-lg font-bold ${wuxingColors[n.gan]}`}>{n.gan}</span><span className="text-[9px] text-muted-foreground align-top ml-px">{n.shiShen}</span>
                </td>
              ))}
            </tr>
            <tr>
              {data.liuNian.map((n, i) => (
                <td key={i} className={`${n.active ? "bg-primary/8" : ""}`}>
                  <span className={`text-lg font-bold ${wuxingColors[n.zhi]}`}>{n.zhi}</span><span className="text-[9px] text-muted-foreground align-top ml-px">{n.shiShenZhi}</span>
                </td>
              ))}
            </tr>
            <tr className="text-[10px] text-muted-foreground">
              {data.liuNian.map((n, i) => <td key={i} className={`pb-1 ${n.active ? "bg-primary/8" : ""}`}>{n.age}岁</td>)}
            </tr>
          </tbody>
        </table>
      </div>

      {/* 古籍参考 */}
      <ClassicsSection selectedClassic={selectedClassic} setSelectedClassic={setSelectedClassic} classicMode={classicMode} setClassicMode={setClassicMode} />

      {/* AI辅助分析 */}
      <button className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-medium flex items-center justify-center gap-2 shadow-sm hover:opacity-90 transition-opacity">
        <Sparkles className="w-5 h-5" />
        <span>AI辅助分析</span>
      </button>
    </div>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 分析模式
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function AnalysisMode({ data, onEdit }: { data: typeof baziData; onEdit: () => void }) {
  const [selectedDaYun, setSelectedDaYun] = useState(4)
  const [selectedLiuNian, setSelectedLiuNian] = useState(0)
  const [selectedLiuYue, setSelectedLiuYue] = useState(4)
  const [selectedLiuRi, setSelectedLiuRi] = useState(16)
  const [selectedClassic, setSelectedClassic] = useState<string | null>(null)
  const [classicMode, setClassicMode] = useState<"\u539F\u6587" | "\u8BD1\u6587" | "\u5BF9\u7167">("\u539F\u6587")

  // 动态生成流年：根据所选大运起始年生成10年
  const dynamicLiuNian = useMemo(() => {
    const daYun = data.daYun[selectedDaYun]
    if (!daYun) return data.liuNian
    return generateLiuNian(daYun.year, 10, data.birthYear || 1983)
  }, [selectedDaYun, data.daYun, data.liuNian, data.birthYear])

  // 选大运时，自动定位当前年份或默认第一个
  const handleSelectDaYun = (idx: number) => {
    setSelectedDaYun(idx)
    const currentYear = new Date().getFullYear()
    const daYun = data.daYun[idx]
    const liuNian = generateLiuNian(daYun.year, 10, data.birthYear || 1983)
    const currentIdx = liuNian.findIndex(n => n.year === currentYear)
    setSelectedLiuNian(currentIdx >= 0 ? currentIdx : 0)
  }

  const liuYueData = useMemo(() => Array.from({ length: 12 }, (_, i) => {
    const gan = GANS[i % 10]
    const zhi = (["\u5BC5","\u536F","\u8FB0","\u5DF3","\u5348","\u672A","\u7533","\u9149","\u620C","\u4EA5","\u5B50","\u4E11"] as const)[i]
    return { month: i + 1, gan, zhi, shiShen: GAN_SHI_SHEN[gan], shiShenZhi: ZHI_SHI_SHEN[zhi] }
  }), [])
  const liuRiData = useMemo(() => Array.from({ length: 31 }, (_, i) => ({ day: i + 1, gan: GANS[i % 10], zhi: ZHIS[i % 12] })), [])

  const currentDaYun = data.daYun[selectedDaYun]
  const currentLiuNian = dynamicLiuNian[selectedLiuNian] || dynamicLiuNian[0]
  const currentLiuYue = liuYueData[selectedLiuYue]
  const currentLiuRi = liuRiData[selectedLiuRi]

  return (
    <div className="p-2.5 space-y-2">

      {/* 基本信息 */}
      <div className="bg-card rounded-lg border border-border px-3 py-2.5 flex items-center justify-between">
        <div className="text-sm text-foreground">
          <span className="text-primary font-medium">名称：</span>{data.name}
          <span className="text-primary font-medium ml-3">性别：</span>{data.gender}
          <span className="ml-3">出生于{data.solarDate}（{data.lunarDate}）</span>
        </div>
        <button onClick={onEdit} className="p-1 text-muted-foreground hover:text-primary"><Pencil className="w-3.5 h-3.5" /></button>
      </div>

      {/* 八柱总表 */}
      <div className="bg-card rounded-lg border border-border overflow-x-auto">
        <table className="w-full text-center min-w-[560px] text-sm">
          <thead>
            <tr className="bg-primary/5">
              <th className="py-1.5 w-9 text-xs text-muted-foreground"></th>
              {COL_NAMES.map((n, i) => <th key={i} className={`py-1.5 text-sm font-semibold ${i === 2 ? "text-primary" : "text-foreground"}`}>{n}</th>)}
              <th className="py-1.5 text-sm font-semibold text-foreground bg-secondary/40">大运</th>
              <th className="py-1.5 text-sm font-semibold text-foreground bg-secondary/40">流年</th>
              <th className="py-1.5 text-sm font-semibold text-foreground bg-secondary/40">流月</th>
              <th className="py-1.5 text-sm font-semibold text-foreground bg-secondary/40">流日</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-border text-muted-foreground text-xs">
              <td className="py-0.5">十神</td>
              {COLS.map((k) => <td key={k}>{data.siZhu[k].shiShen}</td>)}
              <td className="bg-secondary/20">{currentDaYun.shiShen}</td>
              <td className="bg-secondary/20">{currentLiuNian.shiShen}</td>
              <td className="bg-secondary/20">{GAN_SHI_SHEN[currentLiuYue.gan]}</td>
              <td className="bg-secondary/20">{GAN_SHI_SHEN[currentLiuRi.gan]}</td>
            </tr>
            <tr className="bg-secondary/10">
              <td className="py-0.5 text-primary text-xs font-medium">{data.qianKun}</td>
              {COLS.map((k) => <td key={k}><span className={`text-xl font-black ${wuxingColors[data.siZhu[k].gan]}`}>{data.siZhu[k].gan}</span></td>)}
              <td className="bg-secondary/20"><span className={`text-xl font-black ${wuxingColors[currentDaYun.gan]}`}>{currentDaYun.gan}</span></td>
              <td className="bg-secondary/20"><span className={`text-xl font-black ${wuxingColors[currentLiuNian.gan]}`}>{currentLiuNian.gan}</span></td>
              <td className="bg-secondary/20"><span className={`text-xl font-black ${wuxingColors[currentLiuYue.gan]}`}>{currentLiuYue.gan}</span></td>
              <td className="bg-secondary/20"><span className={`text-xl font-black ${wuxingColors[currentLiuRi.gan]}`}>{currentLiuRi.gan}</span></td>
            </tr>
            <tr className="bg-secondary/10">
              <td></td>
              {COLS.map((k) => <td key={k}><span className={`text-xl font-black ${wuxingColors[data.siZhu[k].zhi]}`}>{data.siZhu[k].zhi}</span></td>)}
              <td className="bg-secondary/20"><span className={`text-xl font-black ${wuxingColors[currentDaYun.zhi]}`}>{currentDaYun.zhi}</span></td>
              <td className="bg-secondary/20"><span className={`text-xl font-black ${wuxingColors[currentLiuNian.zhi]}`}>{currentLiuNian.zhi}</span></td>
              <td className="bg-secondary/20"><span className={`text-xl font-black ${wuxingColors[currentLiuYue.zhi]}`}>{currentLiuYue.zhi}</span></td>
              <td className="bg-secondary/20"><span className={`text-xl font-black ${wuxingColors[currentLiuRi.zhi]}`}>{currentLiuRi.zhi}</span></td>
            </tr>
            <tr className="border-t border-border text-xs">
              <td className="py-1 text-primary font-medium align-top">藏干</td>
              {COLS.map((k) => (
                <td key={k} className="align-top py-1">
                  <div className="flex justify-center gap-0.5">
                    {data.siZhu[k].cangGan.map((c, i) => (
                      <span key={i} className={`font-bold ${wuxingColors[c.gan]}`}>{c.gan}</span>
                    ))}
                  </div>
                  <div className="flex justify-center gap-0.5 text-[10px] text-muted-foreground mt-px">
                    {data.siZhu[k].cangGan.map((c, i) => (
                      <span key={i}>{c.shen}</span>
                    ))}
                  </div>
                </td>
              ))}
              {[currentDaYun, currentLiuNian, currentLiuYue, currentLiuRi].map((item, idx) => {
                const cangGan = ZHI_CANG_GAN[item.zhi] || []
                return (
                  <td key={idx} className="bg-secondary/20 align-top py-1">
                    <div className="flex justify-center gap-0.5">
                      {cangGan.map((c, i) => (
                        <span key={i} className={`font-bold ${wuxingColors[c.gan]}`}>{c.gan}</span>
                      ))}
                    </div>
                    <div className="flex justify-center gap-0.5 text-[10px] text-muted-foreground mt-px">
                      {cangGan.map((c, i) => (
                        <span key={i}>{c.shen}</span>
                      ))}
                    </div>
                  </td>
                )
              })}
            </tr>
          </tbody>
        </table>
      </div>

      {/* 干支关系提示 */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <SectionTitle>提示</SectionTitle>
        <div className="px-3 pb-3 space-y-1.5">
          <div className="flex flex-wrap gap-1.5">
            {data.relations.tianGan.map((r, i) => <span key={i} className="px-2 py-0.5 bg-wuxing-wood/10 text-wuxing-wood rounded text-xs font-semibold">【{r}】</span>)}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {data.relations.diZhi.map((r, i) => (
              <span key={i} className={`px-2 py-0.5 rounded text-xs font-semibold ${r.includes("冲") || r.includes("刑") || r.includes("害") ? "bg-wuxing-fire/10 text-wuxing-fire" : "bg-wuxing-earth/10 text-wuxing-earth"}`}>【{r}】</span>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {data.relations.zhengZhu.map((r, i) => <span key={i} className="px-2 py-0.5 bg-wuxing-water/10 text-wuxing-water rounded text-xs font-semibold">【{r}】</span>)}
          </div>
        </div>
      </div>

      {/* 大运选择 */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <SectionTitle extra={<span className="text-xs text-muted-foreground">点击选择</span>}>大运</SectionTitle>
        <table className="w-full text-center">
          <tbody>
            <tr className="text-xs text-muted-foreground">{data.daYun.map((d, i) => <td key={i} className="pt-0.5">{d.year}</td>)}</tr>
            <tr>{data.daYun.map((d, i) => (
              <td key={i} className={`cursor-pointer transition-colors ${selectedDaYun === i ? "bg-primary/10" : d.active ? "bg-primary/5" : "hover:bg-secondary"}`} onClick={() => handleSelectDaYun(i)}>
                <span className={`text-lg font-black ${selectedDaYun === i ? "text-primary" : wuxingColors[d.gan]}`}>{d.gan}</span><span className="text-[10px] text-muted-foreground align-top ml-px">{d.shiShen}</span>
              </td>
            ))}</tr>
            <tr>{data.daYun.map((d, i) => (
              <td key={i} className={`cursor-pointer transition-colors ${selectedDaYun === i ? "bg-primary/10" : d.active ? "bg-primary/5" : "hover:bg-secondary"}`} onClick={() => handleSelectDaYun(i)}>
                <span className={`text-lg font-black ${selectedDaYun === i ? "text-primary" : wuxingColors[d.zhi]}`}>{d.zhi}</span><span className="text-[10px] text-muted-foreground align-top ml-px">{d.shiShenZhi}</span>
              </td>
            ))}</tr>
          </tbody>
        </table>
      </div>

      {/* 流年 10个一排 - 根据选中大运动态生成 */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <SectionTitle extra={<span className="text-xs text-muted-foreground">{data.daYun[selectedDaYun]?.year}-{data.daYun[selectedDaYun]?.year + 9}</span>}>流年</SectionTitle>
        <table className="w-full text-center">
          <tbody>
            <tr className="text-xs text-muted-foreground">{dynamicLiuNian.map((n, i) => <td key={i} className="pt-0.5">{n.year}</td>)}</tr>
            <tr>{dynamicLiuNian.map((n, i) => (
              <td key={i} className={`cursor-pointer transition-colors ${selectedLiuNian === i ? "bg-wuxing-water/10" : n.active ? "bg-primary/5" : "hover:bg-secondary"}`} onClick={() => setSelectedLiuNian(i)}>
                <span className={`text-base font-black ${selectedLiuNian === i ? "text-wuxing-water" : wuxingColors[n.gan]}`}>{n.gan}</span><span className="text-[10px] text-muted-foreground align-top ml-px">{n.shiShen}</span>
              </td>
            ))}</tr>
            <tr>{dynamicLiuNian.map((n, i) => (
              <td key={i} className={`cursor-pointer transition-colors ${selectedLiuNian === i ? "bg-wuxing-water/10" : n.active ? "bg-primary/5" : "hover:bg-secondary"}`} onClick={() => setSelectedLiuNian(i)}>
                <span className={`text-base font-black ${selectedLiuNian === i ? "text-wuxing-water" : wuxingColors[n.zhi]}`}>{n.zhi}</span><span className="text-[10px] text-muted-foreground align-top ml-px">{n.shiShenZhi}</span>
              </td>
            ))}</tr>
            <tr className="text-xs text-muted-foreground">{dynamicLiuNian.map((n, i) => <td key={i} className={`pb-0.5 ${selectedLiuNian === i ? "bg-wuxing-water/10" : ""}`}>{n.age}岁</td>)}</tr>
          </tbody>
        </table>
      </div>

      {/* 流月 12个一排 */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <SectionTitle>流月</SectionTitle>
        <table className="w-full text-center">
          <tbody>
            <tr className="text-[10px] text-muted-foreground">{liuYueData.map((m, i) => <td key={i} className="pt-0.5">{m.month}月</td>)}</tr>
            <tr>{liuYueData.map((m, i) => (
              <td key={i} className={`cursor-pointer transition-colors ${selectedLiuYue === i ? "bg-wuxing-earth/10" : "hover:bg-secondary"}`} onClick={() => setSelectedLiuYue(i)}>
                <span className={`text-base font-bold ${selectedLiuYue === i ? "text-wuxing-earth" : wuxingColors[m.gan]}`}>{m.gan}</span><span className="text-[10px] text-muted-foreground align-top ml-px">{m.shiShen}</span>
              </td>
            ))}</tr>
            <tr>{liuYueData.map((m, i) => (
              <td key={i} className={`cursor-pointer transition-colors ${selectedLiuYue === i ? "bg-wuxing-earth/10" : "hover:bg-secondary"}`} onClick={() => setSelectedLiuYue(i)}>
                <span className={`text-base font-bold ${selectedLiuYue === i ? "text-wuxing-earth" : wuxingColors[m.zhi]}`}>{m.zhi}</span><span className="text-[10px] text-muted-foreground align-top ml-px">{m.shiShenZhi}</span>
              </td>
            ))}</tr>
          </tbody>
        </table>
      </div>

      {/* 流日 10列自动适配 */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <SectionTitle>流日</SectionTitle>
        <div className="grid grid-cols-10 gap-px p-1.5 bg-border">
          {liuRiData.map((d, i) => (
            <button key={i} onClick={() => setSelectedLiuRi(i)} className={`py-0.5 text-center transition-colors ${selectedLiuRi === i ? "bg-primary/10" : "bg-card hover:bg-secondary"}`}>
              <div className="text-[9px] text-muted-foreground">{d.day}</div>
              <div className={`text-xs font-bold ${selectedLiuRi === i ? "text-primary" : wuxingColors[d.gan]}`}>{d.gan}</div>
              <div className={`text-xs font-bold ${selectedLiuRi === i ? "text-primary" : wuxingColors[d.zhi]}`}>{d.zhi}</div>
            </button>
          ))}
          {/* 补全空位，凑满40格（4行x10列） */}
          {Array.from({ length: (10 - (liuRiData.length % 10)) % 10 }, (_, i) => (
            <div key={`empty-${i}`} className="bg-card" />
          ))}
        </div>
      </div>

      {/* 五行旺相休囚 */}
      <div className="bg-card rounded-lg border border-border px-3 py-2.5">
        <div className="text-sm font-semibold text-foreground mb-2">五行状态</div>
        <div className="flex justify-around">
          {Object.entries(data.wuxingState).map(([el, st]) => (
            <span key={el} className={`px-2.5 py-1 rounded text-sm font-semibold ${wuxingBgColors[el]}`}>{el}{st}</span>
          ))}
        </div>
      </div>

      {/* 四柱神煞 */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <SectionTitle>四柱神煞</SectionTitle>
        <div className="px-3 pb-2.5 space-y-1.5">
          {COLS.map((k, ci) => (
            <div key={k} className="flex items-start gap-2">
              <div className="shrink-0 w-10 flex gap-0.5">
                <span className={`text-sm font-bold ${wuxingColors[data.siZhu[k].gan]}`}>{data.siZhu[k].gan}</span>
                <span className={`text-sm font-bold ${wuxingColors[data.siZhu[k].zhi]}`}>{data.siZhu[k].zhi}</span>
              </div>
              <span className="text-xs text-muted-foreground leading-relaxed">{data.shenSha[k].join("、")}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 大运神煞 */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <SectionTitle>大运神煞</SectionTitle>
        <div className="px-3 pb-2.5 flex items-start gap-2">
          <div className="shrink-0 w-10 flex gap-0.5">
            <span className={`text-sm font-bold ${wuxingColors[currentDaYun.gan]}`}>{currentDaYun.gan}</span>
            <span className={`text-sm font-bold ${wuxingColors[currentDaYun.zhi]}`}>{currentDaYun.zhi}</span>
          </div>
          <span className="text-xs text-muted-foreground leading-relaxed">天乙贵人、太极贵人、德秀贵人、文昌贵人、天德秀贵</span>
        </div>
      </div>

      {/* 流年神煞 */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <SectionTitle>流年神煞</SectionTitle>
        <div className="px-3 pb-2.5 flex items-start gap-2">
          <div className="shrink-0 w-10 flex gap-0.5">
            <span className={`text-sm font-bold ${wuxingColors[currentLiuNian.gan]}`}>{currentLiuNian.gan}</span>
            <span className={`text-sm font-bold ${wuxingColors[currentLiuNian.zhi]}`}>{currentLiuNian.zhi}</span>
          </div>
          <span className="text-xs text-muted-foreground leading-relaxed">德秀贵人、��星、桃花、血刃、羊刃</span>
        </div>
      </div>

      {/* 古籍参考 */}
      <ClassicsSection selectedClassic={selectedClassic} setSelectedClassic={setSelectedClassic} classicMode={classicMode} setClassicMode={setClassicMode} />

      {/* AI + 命理奇门 */}
      <div className="flex gap-2">
        <button className="flex-1 bg-primary text-primary-foreground py-3 rounded-lg font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
          <Sparkles className="w-5 h-5" /><span>AI辅助分析</span>
        </button>
        <button className="flex-1 bg-accent text-accent-foreground py-3 rounded-lg font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
          <span>命理奇门局</span>
        </button>
      </div>
    </div>
  )
}
