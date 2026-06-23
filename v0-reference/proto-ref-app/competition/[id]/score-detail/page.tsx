"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Share2, Trophy, CheckCircle, XCircle, ChevronDown, ChevronUp, Download, TrendingUp, Award } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

// Mock成绩数据
const scoreData = {
  competitionId: "1",
  competitionTitle: "2024热卜杯·八字命理大赛",
  roundName: "初赛",
  
  // 总体成绩
  totalScore: 86,
  fullScore: 100,
  rank: 128,
  totalParticipants: 1286,
  passLine: 70,
  isPassed: true,
  isPromoted: true, // 是否晋级
  
  // 答题统计
  correctCount: 43,
  wrongCount: 5,
  totalQuestions: 50,
  usedTime: "68分32秒",
  
  // 各维度得分
  dimensions: [
    { name: "基础概念", score: 28, fullScore: 30, percentage: 93 },
    { name: "实战应用", score: 32, fullScore: 40, percentage: 80 },
    { name: "综合分析", score: 26, fullScore: 30, percentage: 87 },
  ],
  
  // 排名趋势（多轮比赛时）
  rankTrend: [
    { round: "报名", rank: 450 },
    { round: "初赛", rank: 128 },
  ],
  
  // 每题详情
  questionDetails: [
    {
      id: "q1",
      content: '八字中的"日主"指的是什么？',
      type: "single",
      myAnswer: "C",
      correctAnswer: "C",
      isCorrect: true,
      score: 2,
      fullScore: 2,
      analysis: "日主是指日柱的天干，代表命主本人。",
    },
    {
      id: "q2",
      content: '以下哪个是"木"的五行属性的天干？',
      type: "single",
      myAnswer: "A",
      correctAnswer: "A",
      isCorrect: true,
      score: 2,
      fullScore: 2,
      analysis: "甲、乙属木，丙、丁属火，戊、己属土，庚、辛属金，壬、癸属水。",
    },
    {
      id: "q3",
      content: '"子"属于十二地支中的哪一个？',
      type: "single",
      myAnswer: "B",
      correctAnswer: "A",
      isCorrect: false,
      score: 0,
      fullScore: 2,
      analysis: "子是十二地支的第一个，顺序为：子、丑、寅、卯、辰、巳、午、未、申、酉、戌、亥。",
    },
    {
      id: "q4",
      content: '以下哪些属于"六冲"关系？',
      type: "multiple",
      myAnswer: ["A", "B", "C", "D"],
      correctAnswer: ["A", "B", "C", "D"],
      isCorrect: true,
      score: 4,
      fullScore: 4,
      analysis: "六冲为：子午冲、丑未冲、寅申冲、卯酉冲、辰戌冲、巳亥冲。",
    },
    {
      id: "q5",
      content: '"正官"代表的是克我且与我同性的五行。',
      type: "judge",
      myAnswer: "B",
      correctAnswer: "B",
      isCorrect: true,
      score: 2,
      fullScore: 2,
      analysis: "正官是克我且与我异性的五行。克我同性的是七杀。",
    },
  ],
}

export default function ScoreDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [showAllQuestions, setShowAllQuestions] = useState(false)
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set())

  const toggleQuestion = (qId: string) => {
    const newSet = new Set(expandedQuestions)
    if (newSet.has(qId)) {
      newSet.delete(qId)
    } else {
      newSet.add(qId)
    }
    setExpandedQuestions(newSet)
  }

  const displayedQuestions = showAllQuestions 
    ? scoreData.questionDetails 
    : scoreData.questionDetails.slice(0, 5)

  return (
    <div className="min-h-screen bg-background pb-6">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 bg-card border-b border-border">
        <div className="flex items-center justify-between px-4 h-11">
          <button onClick={() => router.back()} className="flex items-center">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-medium">成绩详情</h1>
          <button onClick={() => router.push(`/competition/${params.id}/poster`)}>
            <Share2 className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* 成绩总览 */}
      <div className={cn(
        "px-4 py-6 text-center text-white",
        scoreData.isPromoted 
          ? "bg-gradient-to-br from-green-500 to-green-600" 
          : "bg-gradient-to-br from-gray-500 to-gray-600"
      )}>
        <Badge className="bg-white/20 text-white border-0 mb-2">
          {scoreData.roundName}
        </Badge>
        
        <div className="text-5xl font-bold mb-2">{scoreData.totalScore}</div>
        <p className="text-white/80 text-sm mb-4">满分 {scoreData.fullScore}</p>
        
        <div className={cn(
          "inline-flex items-center gap-2 px-4 py-2 rounded-full",
          scoreData.isPromoted ? "bg-white/20" : "bg-white/10"
        )}>
          {scoreData.isPromoted ? (
            <>
              <Award className="w-5 h-5" />
              <span className="font-medium">恭喜晋级复赛！</span>
            </>
          ) : (
            <>
              <span>未能晋级</span>
            </>
          )}
        </div>
        
        <div className="flex items-center justify-center gap-6 mt-4 text-sm">
          <div>
            <p className="text-white/70">排名</p>
            <p className="font-bold text-lg">{scoreData.rank}/{scoreData.totalParticipants}</p>
          </div>
          <div className="w-px h-8 bg-white/20" />
          <div>
            <p className="text-white/70">用时</p>
            <p className="font-bold text-lg">{scoreData.usedTime}</p>
          </div>
          <div className="w-px h-8 bg-white/20" />
          <div>
            <p className="text-white/70">正确率</p>
            <p className="font-bold text-lg">{Math.round(scoreData.correctCount / scoreData.totalQuestions * 100)}%</p>
          </div>
        </div>
      </div>

      {/* 晋级提示 */}
      {scoreData.isPromoted && (
        <Card className="mx-4 -mt-4 relative z-10 p-4 border-green-200 bg-green-50 dark:bg-green-950/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-green-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-green-800 dark:text-green-200">已成功晋级复赛</p>
              <p className="text-sm text-green-600 dark:text-green-400">复赛将于 2024-04-15 开始</p>
            </div>
            <Link href={`/competition/${params.id}/promotion-notice`}>
              <Button size="sm" variant="outline" className="border-green-300 text-green-700">
                查看详情
              </Button>
            </Link>
          </div>
        </Card>
      )}

      {/* 排名变化折线图 */}
      {scoreData.rankTrend.length > 1 && (
        <div className="px-4 mt-4">
          <Card className="p-4">
            <h3 className="font-medium mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              排名变化
            </h3>
            <div className="relative h-28">
              {/* SVG折线图 */}
              <svg className="w-full h-full" viewBox="0 0 300 80" preserveAspectRatio="none">
                {/* 网格线 */}
                <line x1="0" y1="40" x2="300" y2="40" stroke="currentColor" strokeOpacity="0.1" strokeDasharray="4 4" />
                {/* 折线 */}
                {scoreData.rankTrend.map((point, i) => {
                  if (i === 0) return null
                  const prev = scoreData.rankTrend[i - 1]
                  const totalPoints = scoreData.rankTrend.length
                  const maxRank = Math.max(...scoreData.rankTrend.map(p => p.rank))
                  const x1 = ((i - 1) / (totalPoints - 1)) * 300
                  const x2 = (i / (totalPoints - 1)) * 300
                  const y1 = (prev.rank / maxRank) * 60 + 10
                  const y2 = (point.rank / maxRank) * 60 + 10
                  return (
                    <g key={i}>
                      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="hsl(var(--primary))" strokeWidth="2.5" strokeLinecap="round" />
                    </g>
                  )
                })}
                {/* 数据点 */}
                {scoreData.rankTrend.map((point, i) => {
                  const totalPoints = scoreData.rankTrend.length
                  const maxRank = Math.max(...scoreData.rankTrend.map(p => p.rank))
                  const x = (i / (totalPoints - 1)) * 300
                  const y = (point.rank / maxRank) * 60 + 10
                  return (
                    <circle key={i} cx={x} cy={y} r="5" fill="hsl(var(--primary))" stroke="white" strokeWidth="2" />
                  )
                })}
              </svg>
              {/* 标签 */}
              <div className="absolute bottom-0 left-0 right-0 flex justify-between px-1">
                {scoreData.rankTrend.map((point, i) => (
                  <div key={i} className="text-center">
                    <p className="text-xs text-muted-foreground">{point.round}</p>
                    <p className="text-xs font-bold text-primary">#{point.rank}</p>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* 各维度得分 */}
      <div className="px-4 mt-4">
        <Card className="p-4">
          <h3 className="font-medium mb-4">分项得分</h3>
          <div className="space-y-4">
            {scoreData.dimensions.map(dim => (
              <div key={dim.name}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span>{dim.name}</span>
                  <span className="font-medium">{dim.score}/{dim.fullScore}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={dim.percentage} className="flex-1 h-2" />
                  <span className="text-xs text-muted-foreground w-10">{dim.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* 答题统计 */}
      <div className="px-4 mt-4">
        <Card className="p-4">
          <h3 className="font-medium mb-4">答题统计</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-3 bg-secondary rounded-xl">
              <p className="text-2xl font-bold text-green-600">{scoreData.correctCount}</p>
              <p className="text-xs text-muted-foreground">正确</p>
            </div>
            <div className="p-3 bg-secondary rounded-xl">
              <p className="text-2xl font-bold text-red-500">{scoreData.wrongCount}</p>
              <p className="text-xs text-muted-foreground">错误</p>
            </div>
            <div className="p-3 bg-secondary rounded-xl">
              <p className="text-2xl font-bold text-muted-foreground">{scoreData.totalQuestions - scoreData.correctCount - scoreData.wrongCount}</p>
              <p className="text-xs text-muted-foreground">未答</p>
            </div>
          </div>
        </Card>
      </div>

      {/* 题目详情 */}
      <div className="px-4 mt-4">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium">题目详情</h3>
            <Button variant="ghost" size="sm" className="text-xs">
              <Download className="w-3.5 h-3.5 mr-1" />
              下载成绩单
            </Button>
          </div>
          
          <div className="space-y-3">
            {displayedQuestions.map((q, index) => (
              <div key={q.id} className="border border-border rounded-xl overflow-hidden">
                <button
                  onClick={() => toggleQuestion(q.id)}
                  className="w-full p-3 flex items-center gap-3 text-left"
                >
                  <div className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0",
                    q.isCorrect ? "bg-green-100" : "bg-red-100"
                  )}>
                    {q.isCorrect ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{index + 1}. {q.content}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-sm font-medium",
                      q.isCorrect ? "text-green-600" : "text-red-500"
                    )}>
                      {q.score}/{q.fullScore}
                    </span>
                    {expandedQuestions.has(q.id) ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                </button>
                
                {expandedQuestions.has(q.id) && (
                  <div className="px-3 pb-3 pt-0 border-t border-border">
                    <div className="mt-3 space-y-2 text-sm">
                      <div className="flex gap-2">
                        <span className="text-muted-foreground w-16 flex-shrink-0">你的答案</span>
                        <span className={cn(q.isCorrect ? "text-green-600" : "text-red-500")}>
                          {Array.isArray(q.myAnswer) ? q.myAnswer.join(", ") : q.myAnswer}
                        </span>
                      </div>
                      {!q.isCorrect && (
                        <div className="flex gap-2">
                          <span className="text-muted-foreground w-16 flex-shrink-0">正确答案</span>
                          <span className="text-green-600">
                            {Array.isArray(q.correctAnswer) ? q.correctAnswer.join(", ") : q.correctAnswer}
                          </span>
                        </div>
                      )}
                      <div className="mt-2 p-2 bg-secondary rounded-lg">
                        <p className="text-muted-foreground text-xs">解析：{q.analysis}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          
          {scoreData.questionDetails.length > 5 && (
            <Button
              variant="ghost"
              className="w-full mt-3"
              onClick={() => setShowAllQuestions(!showAllQuestions)}
            >
              {showAllQuestions ? "收起" : `查看全部 ${scoreData.questionDetails.length} 题`}
              {showAllQuestions ? (
                <ChevronUp className="w-4 h-4 ml-1" />
              ) : (
                <ChevronDown className="w-4 h-4 ml-1" />
              )}
            </Button>
          )}
        </Card>
      </div>

      {/* 操作按钮 */}
      <div className="px-4 mt-4 flex gap-3">
        <Link href={`/competition/${params.id}/result`} className="flex-1">
          <Button variant="outline" className="w-full">查看排行榜</Button>
        </Link>
        <Link href={`/competition/${params.id}`} className="flex-1">
          <Button className="w-full">返回赛事</Button>
        </Link>
      </div>
    </div>
  )
}
