"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { AlertCircle, Clock, ChevronLeft, ChevronRight, Flag, CheckCircle, Circle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

// Mock试卷数据
const examPaper = {
  roundId: "r1",
  roundName: "初赛",
  competitionTitle: "2024热卜杯·八字命理大赛",
  totalTime: 90 * 60, // 90分钟，秒为单位
  questions: [
    {
      id: "q1",
      type: "single", // single单选, multiple多选, judge判断
      content: "八字中的「日主」指的是什么？",
      options: [
        { id: "A", text: "年柱天干" },
        { id: "B", text: "月柱天干" },
        { id: "C", text: "日柱天干" },
        { id: "D", text: "时柱天干" },
      ],
      score: 2,
    },
    {
      id: "q2",
      type: "single",
      content: "以下哪个是「木」的五行属性的天干？",
      options: [
        { id: "A", text: "甲、乙" },
        { id: "B", text: "丙、丁" },
        { id: "C", text: "戊、己" },
        { id: "D", text: "庚、辛" },
      ],
      score: 2,
    },
    {
      id: "q3",
      type: "single",
      content: "「子」属于十二地支中的哪一个？",
      options: [
        { id: "A", text: "第一个" },
        { id: "B", text: "第五个" },
        { id: "C", text: "第七个" },
        { id: "D", text: "第十二个" },
      ],
      score: 2,
    },
    {
      id: "q4",
      type: "multiple",
      content: "以下哪些属于「六冲」关系？（多选）",
      options: [
        { id: "A", text: "子午冲" },
        { id: "B", text: "丑未冲" },
        { id: "C", text: "寅申冲" },
        { id: "D", text: "卯酉冲" },
      ],
      score: 4,
    },
    {
      id: "q5",
      type: "judge",
      content: "「正官」代表的是克我且与我同性的五行。",
      options: [
        { id: "A", text: "正确" },
        { id: "B", text: "错误" },
      ],
      score: 2,
    },
  ],
}

type Answer = {
  questionId: string
  answer: string | string[]
  marked: boolean
}

export default function CompetitionQuizPage() {
  const params = useParams()
  const router = useRouter()
  
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, Answer>>({})
  const [timeLeft, setTimeLeft] = useState(examPaper.totalTime)
  const [showSubmitDialog, setShowSubmitDialog] = useState(false)
  const [showExitDialog, setShowExitDialog] = useState(false)
  const [showAnswerSheet, setShowAnswerSheet] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const currentQuestion = examPaper.questions[currentIndex]
  const totalQuestions = examPaper.questions.length

  // 倒计时
  useEffect(() => {
    if (isSubmitted) return
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          handleAutoSubmit()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [isSubmitted])

  // 格式化时间
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  // 选择答案
  const handleSelectOption = (optionId: string) => {
    const question = currentQuestion
    
    if (question.type === "multiple") {
      // 多选
      const currentAnswer = (answers[question.id]?.answer as string[]) || []
      const newAnswer = currentAnswer.includes(optionId)
        ? currentAnswer.filter(id => id !== optionId)
        : [...currentAnswer, optionId]
      
      setAnswers(prev => ({
        ...prev,
        [question.id]: {
          questionId: question.id,
          answer: newAnswer,
          marked: prev[question.id]?.marked || false,
        }
      }))
    } else {
      // 单选/判断
      setAnswers(prev => ({
        ...prev,
        [question.id]: {
          questionId: question.id,
          answer: optionId,
          marked: prev[question.id]?.marked || false,
        }
      }))
    }
  }

  // 标记题目
  const handleMarkQuestion = () => {
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: {
        ...prev[currentQuestion.id],
        questionId: currentQuestion.id,
        answer: prev[currentQuestion.id]?.answer || "",
        marked: !prev[currentQuestion.id]?.marked,
      }
    }))
  }

  // 上一题/下一题
  const goToPrev = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1)
  }
  
  const goToNext = () => {
    if (currentIndex < totalQuestions - 1) setCurrentIndex(currentIndex + 1)
  }

  // 跳转到指定题目
  const goToQuestion = (index: number) => {
    setCurrentIndex(index)
    setShowAnswerSheet(false)
  }

  // 自动提交（时间到）
  const handleAutoSubmit = async () => {
    setIsSubmitting(true)
    await new Promise(resolve => setTimeout(resolve, 1500))
    setIsSubmitted(true)
    setIsSubmitting(false)
    router.push(`/competition/${params.id}/score-detail`)
  }

  // 手动提交
  const handleSubmit = async () => {
    setShowSubmitDialog(false)
    setIsSubmitting(true)
    await new Promise(resolve => setTimeout(resolve, 1500))
    setIsSubmitted(true)
    setIsSubmitting(false)
    router.push(`/competition/${params.id}/score-detail`)
  }

  // 统计答题情况
  const answeredCount = Object.values(answers).filter(a => 
    a.answer && (Array.isArray(a.answer) ? a.answer.length > 0 : a.answer !== "")
  ).length
  const markedCount = Object.values(answers).filter(a => a.marked).length

  // 检查选项是否被选中
  const isOptionSelected = (optionId: string) => {
    const answer = answers[currentQuestion.id]?.answer
    if (Array.isArray(answer)) {
      return answer.includes(optionId)
    }
    return answer === optionId
  }

  if (isSubmitting) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-lg font-medium">正在提交答卷...</p>
          <p className="text-muted-foreground text-sm mt-1">请勿关闭页面</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* 顶部状态栏 */}
      <header className="sticky top-0 z-50 bg-card border-b border-border">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            {/* 退出按钮：答题中触发确认弹窗 */}
            <button onClick={() => setShowExitDialog(true)} className="text-muted-foreground">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="font-medium text-sm truncate flex-1 text-center">{examPaper.competitionTitle}</h1>
            <Badge variant="secondary">{examPaper.roundName}</Badge>
          </div>
          
          {/* 倒计时和进度 */}
          <div className="flex items-center justify-between">
            <div className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-mono transition-colors",
              timeLeft <= 60
                ? "bg-red-600 text-white animate-pulse"
                : timeLeft <= 300
                ? "bg-red-100 text-red-600 animate-pulse"
                : "bg-secondary"
            )}>
              <Clock className="w-4 h-4" />
              <span className="font-bold">{formatTime(timeLeft)}</span>
              {timeLeft <= 300 && timeLeft > 0 && (
                <AlertCircle className="w-3.5 h-3.5 ml-0.5" />
              )}
            </div>
            
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{currentIndex + 1}/{totalQuestions}</span>
              <span>·</span>
              <span>已答 {answeredCount}</span>
              {markedCount > 0 && (
                <>
                  <span>·</span>
                  <span className="text-amber-600">标记 {markedCount}</span>
                </>
              )}
            </div>
          </div>
          
          <Progress value={(answeredCount / totalQuestions) * 100} className="h-1 mt-2" />
        </div>
      </header>

      {/* 题目区域 */}
      <div className="px-4 py-4">
        <Card className="p-4">
          {/* 题目类型和分值 */}
          <div className="flex items-center justify-between mb-3">
            <Badge variant="outline">
              {currentQuestion.type === "single" ? "单选题" : 
               currentQuestion.type === "multiple" ? "多选题" : "判断题"}
            </Badge>
            <span className="text-sm text-muted-foreground">{currentQuestion.score}分</span>
          </div>
          
          {/* 题目内容 */}
          <div className="mb-4">
            <p className="text-base leading-relaxed">
              <span className="font-bold text-primary mr-2">{currentIndex + 1}.</span>
              {currentQuestion.content}
            </p>
          </div>
          
          {/* 选项列表 */}
          <div className="space-y-3">
            {currentQuestion.options.map(option => (
              <button
                key={option.id}
                onClick={() => handleSelectOption(option.id)}
                className={cn(
                  "w-full p-4 rounded-xl border-2 text-left transition-all flex items-start gap-3",
                  isOptionSelected(option.id)
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                )}
              >
                <span className={cn(
                  "w-6 h-6 rounded-full border-2 flex items-center justify-center text-sm font-medium flex-shrink-0",
                  isOptionSelected(option.id)
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-muted-foreground/30"
                )}>
                  {option.id}
                </span>
                <span className="flex-1">{option.text}</span>
              </button>
            ))}
          </div>
        </Card>

        {/* 标记按钮 */}
        <div className="mt-4 flex justify-center">
          <button
            onClick={handleMarkQuestion}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 rounded-full text-sm transition-colors",
              answers[currentQuestion.id]?.marked
                ? "bg-amber-100 text-amber-700"
                : "bg-secondary text-muted-foreground"
            )}
          >
            <Flag className="w-4 h-4" />
            {answers[currentQuestion.id]?.marked ? "已标记" : "标记此题"}
          </button>
        </div>
      </div>

      {/* 底部导航 */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4 z-50">
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="outline"
            onClick={goToPrev}
            disabled={currentIndex === 0}
            className="flex-1"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            上一题
          </Button>
          
          {/* 答题卡 */}
          <Sheet open={showAnswerSheet} onOpenChange={setShowAnswerSheet}>
            <SheetTrigger asChild>
              <Button variant="secondary" size="icon">
                <span className="text-xs font-bold">{answeredCount}/{totalQuestions}</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[60vh]">
              <SheetHeader>
                <SheetTitle>答题卡</SheetTitle>
              </SheetHeader>
              <div className="mt-4">
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                  <span className="flex items-center gap-1">
                    <span className="w-6 h-6 rounded bg-primary/10 border-2 border-primary" /> 已答
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-6 h-6 rounded bg-amber-100 border-2 border-amber-400" /> 标记
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-6 h-6 rounded bg-secondary border-2 border-border" /> 未答
                  </span>
                </div>
                <div className="grid grid-cols-6 gap-2">
                  {examPaper.questions.map((q, index) => {
                    const answer = answers[q.id]
                    const isAnswered = answer?.answer && (Array.isArray(answer.answer) ? answer.answer.length > 0 : answer.answer !== "")
                    const isMarked = answer?.marked
                    const isCurrent = index === currentIndex
                    
                    return (
                      <button
                        key={q.id}
                        onClick={() => goToQuestion(index)}
                        className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center text-sm font-medium border-2 transition-colors",
                          isCurrent && "ring-2 ring-primary ring-offset-2",
                          isMarked ? "bg-amber-100 border-amber-400 text-amber-700" :
                          isAnswered ? "bg-primary/10 border-primary text-primary" :
                          "bg-secondary border-border text-muted-foreground"
                        )}
                      >
                        {index + 1}
                      </button>
                    )
                  })}
                </div>
                
                <Button 
                  className="w-full mt-6" 
                  onClick={() => {
                    setShowAnswerSheet(false)
                    setShowSubmitDialog(true)
                  }}
                >
                  提交答卷
                </Button>
              </div>
            </SheetContent>
          </Sheet>
          
          {currentIndex === totalQuestions - 1 ? (
            <Button onClick={() => setShowSubmitDialog(true)} className="flex-1">
              提交答卷
            </Button>
          ) : (
            <Button onClick={goToNext} className="flex-1">
              下一题
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </div>

      {/* 退出确认弹窗 */}
      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确定退出答题？</AlertDialogTitle>
            <AlertDialogDescription>
              退出后当前答题进度将丢失，无法恢复。剩余时间 {formatTime(timeLeft)}，确定要退出吗？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>继续答题</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => router.back()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              确定退出
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 提交确认弹窗 */}
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认提交答卷？</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-2 mt-2">
                <p>已答题目：{answeredCount}/{totalQuestions}</p>
                <p>未答题目：{totalQuestions - answeredCount}</p>
                {markedCount > 0 && (
                  <p className="text-amber-600">标记题目：{markedCount}</p>
                )}
                <p className="text-muted-foreground text-sm mt-2">
                  提交后将无法修改答案，请确认后提交。
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>继续答题</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmit}>确认提交</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
