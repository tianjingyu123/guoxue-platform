"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, ChevronLeft, ChevronRight, Star, Send, Users, Clock, CheckCircle, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

// Mock选手详情（实际从API按ID获取）
const participantDetails: Record<string, { name: string; participantNo: string; group: string; roundName: string }> = {
  p1: { name: "张易学", participantNo: "BZ20240001", group: "高手组", roundName: "决赛" },
  p2: { name: "李命理", participantNo: "BZ20240002", group: "高手组", roundName: "决赛" },
  p3: { name: "王八字", participantNo: "BZ20240003", group: "进阶组", roundName: "决赛" },
  p4: { name: "赵玄机", participantNo: "BZ20240004", group: "高手组", roundName: "决赛" },
  p5: { name: "钱国学", participantNo: "BZ20240005", group: "进阶组", roundName: "决赛" },
}

// 评分维度
const scoreDimensions = [
  { id: "expression", name: "表现力", description: "表达清晰、逻辑性强", maxScore: 10 },
  { id: "content", name: "内容深度", description: "分析透彻、见解独到", maxScore: 10 },
  { id: "technique", name: "专业技巧", description: "技法准确、应用得当", maxScore: 10 },
  { id: "innovation", name: "创新性", description: "思路新颖、有独特见解", maxScore: 10 },
]

// 待评审队列
const pendingParticipants = [
  { id: "p1", name: "张易学", status: "current" },
  { id: "p2", name: "李命理", status: "pending" },
  { id: "p3", name: "王八字", status: "pending" },
  { id: "p4", name: "赵玄机", status: "pending" },
  { id: "p5", name: "钱国学", status: "pending" },
]

export default function JudgePage() {
  const params = useParams()
  const router = useRouter()
  
  const [scores, setScores] = useState<Record<string, number>>({
    expression: 7,
    content: 7,
    technique: 7,
    innovation: 7,
  })
  const [comment, setComment] = useState("")
  const [showConfirm, setShowConfirm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [completedCount, setCompletedCount] = useState(0)

  const totalScore = Object.values(scores).reduce((sum, s) => sum + s, 0)
  const maxTotalScore = scoreDimensions.reduce((sum, d) => sum + d.maxScore, 0)

  // 当前选手随索引动态变化
  const currentParticipantId = pendingParticipants[currentIndex]?.id ?? "p1"
  const currentParticipant = participantDetails[currentParticipantId] ?? participantDetails["p1"]

  const handleScoreChange = (dimensionId: string, value: number[]) => {
    setScores(prev => ({ ...prev, [dimensionId]: value[0] }))
  }

  const handleSubmit = async () => {
    setShowConfirm(false)
    setIsSubmitting(true)
    
    // 模拟提交
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    setIsSubmitting(false)
    setCompletedCount(prev => prev + 1)
    
    // 切换到下一个选手
    if (currentIndex < pendingParticipants.length - 1) {
      setCurrentIndex(prev => prev + 1)
      setScores({ expression: 7, content: 7, technique: 7, innovation: 7 })
      setComment("")
    }
  }

  const goToPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1)
    }
  }

  const goToNext = () => {
    if (currentIndex < pendingParticipants.length - 1) {
      setCurrentIndex(prev => prev + 1)
    }
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 bg-card border-b border-border">
        <div className="flex items-center justify-between px-4 h-11">
          <button onClick={() => router.back()} className="flex items-center">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-medium">评审打分</h1>
          <Badge variant="secondary">
            {completedCount}/{pendingParticipants.length}
          </Badge>
        </div>
        
        {/* 进度条 */}
        <div className="px-4 pb-2">
          <Progress value={(completedCount / pendingParticipants.length) * 100} className="h-1" />
        </div>
      </header>

      {/* 待评审队列 */}
      <div className="px-4 py-3 border-b border-border overflow-x-auto">
        <div className="flex gap-2">
          {pendingParticipants.map((p, index) => (
            <button
              key={p.id}
              onClick={() => setCurrentIndex(index)}
              className={cn(
                "px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors flex items-center gap-1.5",
                index === currentIndex
                  ? "bg-primary text-primary-foreground"
                  : index < completedCount
                  ? "bg-green-100 text-green-700"
                  : "bg-secondary text-muted-foreground"
              )}
            >
              {index < completedCount && <CheckCircle className="w-3 h-3" />}
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* 当前选手信息 */}
      <div className="px-4 py-4">
        <Card className="p-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="w-8 h-8 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-lg">{currentParticipant.name}</h2>
                <Badge variant="secondary">{currentParticipant.group}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                编号: {currentParticipant.participantNo}
              </p>
              <p className="text-sm text-muted-foreground">
                {currentParticipant.roundName} · 第 {currentIndex + 1} 位选手
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* 评分区域 */}
      <div className="px-4 space-y-4">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium">多维度评分</h3>
            <div className="text-right">
              <span className="text-2xl font-bold text-primary">{totalScore}</span>
              <span className="text-muted-foreground">/{maxTotalScore}</span>
            </div>
          </div>
          
          <div className="space-y-6">
            {scoreDimensions.map(dim => (
              <div key={dim.id}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="font-medium">{dim.name}</span>
                    <span className="text-xs text-muted-foreground ml-2">{dim.description}</span>
                  </div>
                  <span className="font-bold text-lg text-primary">{scores[dim.id]}</span>
                </div>
                <Slider
                  value={[scores[dim.id]]}
                  onValueChange={(value) => handleScoreChange(dim.id, value)}
                  max={dim.maxScore}
                  min={0}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>0</span>
                  <span>{dim.maxScore}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* 评语 */}
        <Card className="p-4">
          <h3 className="font-medium mb-3 flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            评语（选填）
          </h3>
          <Textarea
            placeholder="请输入对该选手的评价和建议..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
          />
        </Card>
      </div>

      {/* 底部操作栏 */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4 z-50">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={goToPrev}
            disabled={currentIndex === 0}
            className="flex-shrink-0"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          
          <Button 
            className="flex-1" 
            onClick={() => setShowConfirm(true)}
            disabled={isSubmitting}
          >
            {isSubmitting ? "提交中..." : "提交评分"}
            <Send className="w-4 h-4 ml-2" />
          </Button>
          
          <Button
            variant="outline"
            onClick={goToNext}
            disabled={currentIndex === pendingParticipants.length - 1}
            className="flex-shrink-0"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* 确认弹窗 */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认提交评分？</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-2 mt-2">
                <p>选手：{currentParticipant.name}</p>
                <p>总分：{totalScore}/{maxTotalScore}</p>
                {comment && <p>评语：{comment.slice(0, 50)}...</p>}
                <p className="text-muted-foreground text-sm mt-2">
                  提交后将无法修改，请确认后提交。
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>返回修改</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmit}>确认提交</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
