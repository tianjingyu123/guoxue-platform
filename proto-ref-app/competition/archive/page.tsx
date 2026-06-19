"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Trophy, Crown, Medal, Award, Users, Calendar, Play, ChevronDown, ChevronUp, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

// Mock历届比赛数据
const archiveData = [
  {
    id: "2023",
    title: "2023热卜杯·八字命理大赛",
    year: 2023,
    edition: "第一届",
    startTime: "2023-04-01",
    endTime: "2023-04-30",
    totalParticipants: 986,
    topThree: [
      { rank: 1, name: "王命理", avatar: "", score: 96, title: "冠军" },
      { rank: 2, name: "李八字", avatar: "", score: 94, title: "亚军" },
      { rank: 3, name: "张易学", avatar: "", score: 92, title: "季军" },
    ],
    highlights: [
      "首届比赛，共吸引986名选手参赛",
      "决赛采用直播PK形式",
      "冠军王命理获得平台金牌认证",
    ],
    hasReplay: true,
    replayUrl: "/videos/competition-2023-final.mp4",
  },
  {
    id: "2022-ziwei",
    title: "2022紫微斗数精英赛",
    year: 2022,
    edition: "首届",
    startTime: "2022-10-01",
    endTime: "2022-10-31",
    totalParticipants: 568,
    topThree: [
      { rank: 1, name: "陈斗数", avatar: "", score: 95, title: "冠军" },
      { rank: 2, name: "周紫微", avatar: "", score: 93, title: "亚军" },
      { rank: 3, name: "吴星曜", avatar: "", score: 91, title: "季军" },
    ],
    highlights: [
      "紫微斗数专项比赛",
      "邀请多位业内专家担任评委",
      "冠军陈斗数后成为平台签约老师",
    ],
    hasReplay: true,
    replayUrl: "/videos/competition-2022-ziwei.mp4",
  },
  {
    id: "2022-fengshui",
    title: "2022风水堪舆设计大赛",
    year: 2022,
    edition: "首届",
    startTime: "2022-06-01",
    endTime: "2022-07-15",
    totalParticipants: 423,
    topThree: [
      { rank: 1, name: "赵风水", avatar: "", score: 94, title: "冠军" },
      { rank: 2, name: "钱堪舆", avatar: "", score: 92, title: "亚军" },
      { rank: 3, name: "孙玄空", avatar: "", score: 90, title: "季军" },
    ],
    highlights: [
      "首次采用作品提交+专家评审模式",
      "优秀作品在平台展示",
      "多个设计作品被实际采用",
    ],
    hasReplay: false,
    replayUrl: "",
  },
]

// 年份筛选
const years = [
  { value: "all", label: "全部" },
  { value: "2023", label: "2023年" },
  { value: "2022", label: "2022年" },
]

export default function CompetitionArchivePage() {
  const router = useRouter()
  const [selectedYear, setSelectedYear] = useState("all")
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const filteredData = archiveData.filter(item => 
    selectedYear === "all" || item.year.toString() === selectedYear
  )

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id)
  }

  return (
    <div className="min-h-screen bg-background pb-6">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 bg-card border-b border-border">
        <div className="flex items-center justify-between px-4 h-11">
          <button onClick={() => router.back()} className="flex items-center">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-medium">历届比赛档案</h1>
          <div className="w-5" />
        </div>
      </header>

      {/* 年份筛选 */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex gap-2">
          {years.map(year => (
            <button
              key={year.value}
              onClick={() => setSelectedYear(year.value)}
              className={cn(
                "px-4 py-1.5 rounded-full text-sm transition-colors",
                selectedYear === year.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground"
              )}
            >
              {year.label}
            </button>
          ))}
        </div>
      </div>

      {/* 历届比赛列表 */}
      <div className="px-4 py-4 space-y-4">
        {filteredData.map(competition => (
          <Card key={competition.id} className="overflow-hidden">
            {/* 基本信息 */}
            <div className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <Badge variant="secondary" className="mb-2">{competition.edition}</Badge>
                  <h3 className="font-bold">{competition.title}</h3>
                </div>
                <span className="text-sm text-muted-foreground">{competition.year}</span>
              </div>
              
              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {competition.startTime}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {competition.totalParticipants}人参赛
                </span>
              </div>

              {/* 前三名展示 */}
              <div className="flex items-end justify-center gap-3 py-4 bg-gradient-to-b from-amber-50/50 to-transparent rounded-xl">
                {/* 亚军 */}
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-gray-100 mx-auto mb-1 flex items-center justify-center">
                    <Medal className="w-5 h-5 text-gray-400" />
                  </div>
                  <p className="text-xs font-medium">{competition.topThree[1].name}</p>
                  <p className="text-xs text-muted-foreground">{competition.topThree[1].score}分</p>
                </div>
                
                {/* 冠军 */}
                <div className="text-center -mt-4">
                  <div className="w-16 h-16 rounded-full bg-amber-100 mx-auto mb-1 flex items-center justify-center">
                    <Crown className="w-7 h-7 text-amber-500" />
                  </div>
                  <p className="text-sm font-bold">{competition.topThree[0].name}</p>
                  <p className="text-xs text-amber-600">{competition.topThree[0].score}分</p>
                </div>
                
                {/* 季军 */}
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-amber-50 mx-auto mb-1 flex items-center justify-center">
                    <Award className="w-5 h-5 text-amber-600" />
                  </div>
                  <p className="text-xs font-medium">{competition.topThree[2].name}</p>
                  <p className="text-xs text-muted-foreground">{competition.topThree[2].score}分</p>
                </div>
              </div>

              {/* 展开/收起按钮 */}
              <button
                onClick={() => toggleExpand(competition.id)}
                className="w-full flex items-center justify-center gap-1 text-sm text-muted-foreground mt-3 pt-3 border-t border-border"
              >
                {expandedId === competition.id ? (
                  <>收起详情 <ChevronUp className="w-4 h-4" /></>
                ) : (
                  <>查看详情 <ChevronDown className="w-4 h-4" /></>
                )}
              </button>
            </div>

            {/* 展开详情 */}
            {expandedId === competition.id && (
              <div className="px-4 pb-4 border-t border-border">
                <div className="pt-4 space-y-4">
                  {/* 精彩瞬间 */}
                  <div>
                    <h4 className="font-medium text-sm mb-2 flex items-center gap-1">
                      <Star className="w-4 h-4 text-amber-500" />
                      精彩回顾
                    </h4>
                    <ul className="space-y-1">
                      {competition.highlights.map((highlight, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                          {highlight}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex gap-3">
                    {competition.hasReplay && (
                      <Button variant="outline" className="flex-1">
                        <Play className="w-4 h-4 mr-2" />
                        观看回放
                      </Button>
                    )}
                    <Link href={`/competition/${competition.id}/result`} className="flex-1">
                      <Button variant="outline" className="w-full">
                        <Trophy className="w-4 h-4 mr-2" />
                        完整排名
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </Card>
        ))}

        {filteredData.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>暂无历届比赛记录</p>
          </div>
        )}
      </div>
    </div>
  )
}
