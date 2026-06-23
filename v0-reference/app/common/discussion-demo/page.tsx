"use client"

/**
 * 讨论母版样板预览页
 * 展示「书友讨论（评论模式）」与「学员评价（星级模式）」两种形态，
 * 作为各业务场景接入母版的参考样板。
 */

import { useState } from "react"
import { DiscussionPanel } from "@/components/common/discussion-panel"
import type { DiscussionConfig, DiscussionItem } from "@/lib/types/discussion"
import { cn } from "@/lib/utils"

// 古籍·书友讨论（评论模式，含划线引用 + 名家认证 + 精选置顶）
const CLASSIC_CONFIG: DiscussionConfig = {
  scene: "classic",
  mode: "comment",
  title: "书友讨论",
  accentColor: "#c41e3a",
  placeholder: "各抒己见，友善交流…",
}
const CLASSIC_ITEMS: DiscussionItem[] = [
  {
    id: 1,
    author: { id: 1, name: "南山樵者", badge: "master" },
    content: "「天行健」三字，道尽君子自强不息之理。每读至此，皆觉胸中浩然之气升腾。",
    time: "2 小时前",
    likeCount: 286,
    featured: true,
    quote: { text: "天行健，君子以自强不息；地势坤，君子以厚德载物。", source: "乾卦·象传" },
    replies: [
      { id: 11, author: { id: 2, name: "习坎" }, content: "受教了，先生此解通透。", time: "1 小时前", likeCount: 12, replyToName: "南山樵者" },
    ],
    replyCount: 8,
  },
  {
    id: 2,
    author: { id: 3, name: "明德讲堂", badge: "teacher" },
    content: "建议结合《周易程氏传》一同研读，对卦象的理解会更深一层。",
    time: "5 小时前",
    likeCount: 142,
    replies: [],
  },
  {
    id: 3,
    author: { id: 4, name: "学而时习", level: 6 },
    content: "刚入门，请问这一卦适合初学者从哪里开始读起？",
    time: "昨天",
    likeCount: 23,
    replies: [],
  },
]

// 课程·学员评价（星级模式 + 讲师认证）
const COURSE_CONFIG: DiscussionConfig = {
  scene: "course",
  mode: "review",
  title: "学员评价",
  accentColor: "#c41e3a",
  averageRating: 4.8,
  placeholder: "分享你的学习心得…",
}
const COURSE_ITEMS: DiscussionItem[] = [
  {
    id: 1,
    author: { id: 1, name: "周明远", badge: "vip" },
    content: "老师讲得深入浅出，把晦涩的命理知识讲得清晰易懂，课程结构也很合理，强烈推荐！",
    time: "3 天前",
    likeCount: 56,
    rating: 5,
    featured: true,
    replies: [
      { id: 11, author: { id: 99, name: "课程助教", badge: "official" }, content: "感谢支持，祝学习愉快～", time: "2 天前", likeCount: 3, replyToName: "周明远" },
    ],
    replyCount: 1,
  },
  {
    id: 2,
    author: { id: 2, name: "林清欢", level: 3 },
    content: "内容很扎实，就是希望能多一些实操案例。",
    time: "1 周前",
    likeCount: 18,
    rating: 4,
    replies: [],
  },
]

export default function DiscussionDemoPage() {
  const [tab, setTab] = useState<"classic" | "course">("classic")

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-background">
      <header className="flex-shrink-0 border-b border-border bg-card px-4 py-3">
        <h1 className="text-center text-[16px] font-bold text-foreground">讨论母版 · 样板预览</h1>
        <div className="mt-3 flex gap-2">
          {([
            ["classic", "书友讨论（评论）"],
            ["course", "学员评价（星级）"],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                "flex-1 rounded-lg py-2 text-[13px] font-medium transition-colors",
                tab === key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 overflow-hidden">
        {tab === "classic" ? (
          <DiscussionPanel key="classic" config={CLASSIC_CONFIG} items={CLASSIC_ITEMS} className="h-full" />
        ) : (
          <DiscussionPanel key="course" config={COURSE_CONFIG} items={COURSE_ITEMS} className="h-full" />
        )}
      </div>
    </div>
  )
}
