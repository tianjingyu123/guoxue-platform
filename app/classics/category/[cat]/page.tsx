"use client"

import { useState, use } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { ScrollText, BookOpen, Lightbulb, PenLine, ChevronRight } from "lucide-react"
import { ClassicsHeader, FlatCover, type CoverColor } from "@/components/classics"

type CatId = "jing" | "shi" | "zi" | "ji"

const CAT_CONFIG: Record<
  CatId,
  {
    name: string
    desc: string
    intro: string
    count: string
    from: string
    to: string
    cover: CoverColor
    icon: typeof ScrollText
    subCats: string[]
  }
> = {
  jing: {
    name: "经部",
    desc: "儒家经典",
    intro: "四书五经，儒学根本，立身处世之道尽在其中。",
    count: "3,210",
    from: "#a06a38",
    to: "#6f4521",
    cover: "brown",
    icon: ScrollText,
    subCats: ["全部", "易类", "书类", "诗类", "礼类", "春秋", "四书", "小学"],
  },
  shi: {
    name: "史部",
    desc: "历史典籍",
    intro: "二十四史，编年纪传，鉴往知来通古今之变。",
    count: "2,680",
    from: "#3a6196",
    to: "#243f63",
    cover: "blue",
    icon: BookOpen,
    subCats: ["全部", "正史", "编年", "纪事本末", "别史", "杂史", "传记", "地理"],
  },
  zi: {
    name: "子部",
    desc: "诸子百家",
    intro: "百家争鸣，术数医方，思想智慧的浩瀚星河。",
    count: "4,150",
    from: "#3f8560",
    to: "#27543b",
    cover: "green",
    icon: Lightbulb,
    subCats: ["全部", "儒家", "道家", "法家", "兵家", "医家", "术数", "杂家", "小说"],
  },
  ji: {
    name: "集部",
    desc: "诗词文集",
    intro: "楚辞汉赋，唐诗宋词，千古文心的风雅传承。",
    count: "2,820",
    from: "#9a4f6b",
    to: "#6e3147",
    cover: "red",
    icon: PenLine,
    subCats: ["全部", "楚辞", "别集", "总集", "诗文评", "词曲"],
  },
}

// 各分类的代表书目
const CAT_BOOKS: Record<CatId, { id: string; title: string; author: string; dynasty: string; desc: string; reads: number; isFree: boolean }[]> = {
  jing: [
    { id: "1", title: "周易", author: "伏羲", dynasty: "周", desc: "群经之首，大道之源", reads: 128600, isFree: true },
    { id: "6", title: "论语", author: "孔门弟子", dynasty: "春秋", desc: "仁义礼智，修身齐家", reads: 156800, isFree: true },
    { id: "2", title: "道德经", author: "老子", dynasty: "春秋", desc: "道法自然，无为而治", reads: 145600, isFree: true },
    { id: "10", title: "大学", author: "曾子", dynasty: "春秋", desc: "修齐治平，儒门纲领", reads: 67200, isFree: true },
    { id: "11", title: "中庸", author: "子思", dynasty: "战国", desc: "致中和，天地位焉", reads: 54300, isFree: true },
    { id: "12", title: "尚书", author: "佚名", dynasty: "上古", desc: "上古之书，政事典谟", reads: 43800, isFree: false },
  ],
  shi: [
    { id: "20", title: "史记", author: "司马迁", dynasty: "汉", desc: "史家之绝唱，无韵之离骚", reads: 198600, isFree: true },
    { id: "21", title: "资治通鉴", author: "司马光", dynasty: "宋", desc: "鉴于往事，资于治道", reads: 142300, isFree: true },
    { id: "22", title: "汉书", author: "班固", dynasty: "汉", desc: "断代为史，体例严整", reads: 78900, isFree: false },
    { id: "23", title: "战国策", author: "刘向", dynasty: "汉", desc: "纵横捭阖，谋士风云", reads: 65400, isFree: true },
    { id: "24", title: "三国志", author: "陈寿", dynasty: "晋", desc: "魏蜀吴史，简而有要", reads: 112700, isFree: true },
    { id: "25", title: "左传", author: "左丘明", dynasty: "春秋", desc: "编年叙事，文采斐然", reads: 58200, isFree: false },
  ],
  zi: [
    { id: "5", title: "黄帝内经", author: "佚名", dynasty: "战国", desc: "中医奠基，养生之本", reads: 98500, isFree: true },
    { id: "4", title: "鬼谷子", author: "鬼谷子", dynasty: "战国", desc: "纵横捭阖，谋略奇书", reads: 76200, isFree: true },
    { id: "30", title: "庄子", author: "庄周", dynasty: "战国", desc: "逍遥齐物，汪洋恣肆", reads: 89400, isFree: true },
    { id: "31", title: "孙子兵法", author: "孙武", dynasty: "春秋", desc: "兵学圣典，谋攻为上", reads: 167300, isFree: true },
    { id: "32", title: "韩非子", author: "韩非", dynasty: "战国", desc: "法术势合，集法家大成", reads: 52100, isFree: false },
    { id: "33", title: "墨子", author: "墨翟", dynasty: "战国", desc: "兼爱非攻，尚贤尚同", reads: 41600, isFree: false },
  ],
  ji: [
    { id: "40", title: "楚辞", author: "屈原 等", dynasty: "战国", desc: "香草美人，浪漫之源", reads: 87600, isFree: true },
    { id: "41", title: "李太白集", author: "李白", dynasty: "唐", desc: "诗仙绝唱，飘逸豪放", reads: 134500, isFree: true },
    { id: "42", title: "杜工部集", author: "杜甫", dynasty: "唐", desc: "诗史沉郁，忧国忧民", reads: 121800, isFree: true },
    { id: "43", title: "东坡乐府", author: "苏轼", dynasty: "宋", desc: "豪放词宗，旷达超然", reads: 98300, isFree: true },
    { id: "44", title: "漱玉词", author: "李清照", dynasty: "宋", desc: "婉约正宗，情致深婉", reads: 76900, isFree: false },
    { id: "45", title: "文心雕龙", author: "刘勰", dynasty: "南朝", desc: "文论巨著，体大思精", reads: 38200, isFree: false },
  ],
}

function fmtReads(n: number) {
  return n >= 10000 ? `${(n / 10000).toFixed(1)}万` : `${n}`
}

export default function CategoryPage({ params }: { params: Promise<{ cat: string }> }) {
  const { cat } = use(params)
  const catId = (["jing", "shi", "zi", "ji"].includes(cat) ? cat : "jing") as CatId
  const config = CAT_CONFIG[catId]
  const Icon = config.icon
  const books = CAT_BOOKS[catId]
  const [activeSub, setActiveSub] = useState("全部")
  const [sort, setSort] = useState<"hot" | "new">("hot")

  return (
    <div className="min-h-screen bg-[#f4f2ee] dark:bg-background pb-20 sm:pb-10">
      <ClassicsHeader title={config.name} />

      <main className="max-w-screen-xl mx-auto">
        {/* ===== 分类 Hero ===== */}
        <section className="px-5 sm:px-6 pt-2 pb-5">
          <div
            className="relative rounded-[28px] overflow-hidden p-6 shadow-lg ring-1 ring-black/5"
            style={{ background: `linear-gradient(150deg, ${config.from}, ${config.to})` }}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-[12px] font-semibold tracking-[0.2em] text-white/70 uppercase">四库 · {config.desc}</p>
                <h2 className="mt-2 text-4xl font-bold text-white tracking-tight">{config.name}</h2>
                <p className="mt-3 text-[14px] text-white/80 leading-relaxed max-w-xs text-pretty">{config.intro}</p>
              </div>
              <span className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center flex-shrink-0">
                <Icon className="w-6 h-6 text-white" />
              </span>
            </div>
            <div className="mt-5 flex items-center gap-2 text-[13px] text-white/80">
              <span className="font-semibold text-white tabular-nums text-lg">{config.count}</span>
              <span>部典籍</span>
            </div>
          </div>
        </section>

        {/* ===== 子门类筛选 ===== */}
        <section className="pb-3">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide px-5 sm:px-6">
            {config.subCats.map((sub) => (
              <button
                key={sub}
                onClick={() => setActiveSub(sub)}
                className={cn(
                  "flex-shrink-0 h-8 px-3.5 rounded-full text-[13px] font-medium transition-colors",
                  activeSub === sub
                    ? "bg-foreground text-background"
                    : "bg-card text-muted-foreground ring-1 ring-black/[0.04] dark:ring-white/5",
                )}
              >
                {sub}
              </button>
            ))}
          </div>
        </section>

        {/* ===== 排序 ===== */}
        <section className="px-5 sm:px-6 pb-4 flex items-center justify-between">
          <p className="text-[13px] text-muted-foreground">
            共 <span className="font-semibold text-foreground tabular-nums">{books.length}</span> 部
          </p>
          <div className="flex items-center gap-1 bg-card rounded-full p-0.5 ring-1 ring-black/[0.04] dark:ring-white/5">
            {(["hot", "new"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSort(s)}
                className={cn(
                  "h-7 px-3.5 rounded-full text-[13px] font-medium transition-colors",
                  sort === s ? "bg-[#c41e3a] text-white dark:bg-amber-500" : "text-muted-foreground",
                )}
              >
                {s === "hot" ? "最热" : "最新"}
              </button>
            ))}
          </div>
        </section>

        {/* ===== 书籍网格 ===== */}
        <section className="px-5 sm:px-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {books.map((book, i) => (
            <Link
              key={book.id}
              href={`/classics/${book.id}`}
              className="flex gap-4 p-4 bg-card rounded-2xl shadow-sm ring-1 ring-black/[0.04] dark:ring-white/5 active:scale-[0.99] transition-transform"
            >
              <FlatCover
                title={book.title}
                label={book.dynasty}
                coverColor={config.cover}
                className="w-16 flex-shrink-0"
                titleClassName="text-sm"
              />
              <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-[16px] text-foreground">{book.title}</h3>
                    {book.isFree && (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                        免费
                      </span>
                    )}
                  </div>
                  <p className="text-[12px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed">{book.desc}</p>
                </div>
                <p className="text-[11px] text-muted-foreground/70 mt-1">
                  {book.author} · {book.dynasty} · {fmtReads(book.reads)}人读
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground/40 flex-shrink-0 self-center" />
            </Link>
          ))}
        </section>
      </main>
    </div>
  )
}
