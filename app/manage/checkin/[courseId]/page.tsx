"use client"

import { useState } from "react"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  ArrowLeft, QrCode, Search, Check, X, Users, Clock, 
  Camera, Keyboard, ChevronDown, ChevronUp, CheckCircle2
} from "lucide-react"
import { BackButton } from "@/components/common/back-button"
import { cn } from "@/lib/utils"

// 今日课程数据
const courseData = {
  id: 1,
  title: "八字命理入门实战班",
  date: "2026年5月9日",
  time: "14:00 - 17:00",
  location: "热卜国学·北京朝阳驿站",
  totalEnrolled: 28,
  checkedIn: 15,
}

// 学员数据
const studentsData = [
  { id: 1, name: "张三", avatar: "", phone: "138****1234", enrollTime: "2026-05-01 10:30", checkedIn: true, checkTime: "13:45" },
  { id: 2, name: "李四", avatar: "", phone: "139****5678", enrollTime: "2026-05-02 14:20", checkedIn: true, checkTime: "13:50" },
  { id: 3, name: "王五", avatar: "", phone: "137****9012", enrollTime: "2026-05-03 09:15", checkedIn: true, checkTime: "13:52" },
  { id: 4, name: "赵六", avatar: "", phone: "136****3456", enrollTime: "2026-05-04 16:40", checkedIn: false, checkTime: null },
  { id: 5, name: "钱七", avatar: "", phone: "135****7890", enrollTime: "2026-05-05 11:25", checkedIn: false, checkTime: null },
  { id: 6, name: "孙八", avatar: "", phone: "134****2345", enrollTime: "2026-05-06 08:50", checkedIn: false, checkTime: null },
]

export default function CheckinPage() {
  const [isScanning, setIsScanning] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false)
  const [scannedStudent, setScannedStudent] = useState<typeof studentsData[0] | null>(null)
  const [showManualInput, setShowManualInput] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<typeof studentsData>([])
  const [showCheckedIn, setShowCheckedIn] = useState(true)
  const [showNotCheckedIn, setShowNotCheckedIn] = useState(true)
  const [students, setStudents] = useState(studentsData)

  const checkedInStudents = students.filter(s => s.checkedIn)
  const notCheckedInStudents = students.filter(s => !s.checkedIn)

  // 模拟扫码
  const handleStartScan = () => {
    setIsScanning(true)
    // 模拟2秒后扫描到学员
    setTimeout(() => {
      const student = notCheckedInStudents[0]
      if (student) {
        setScannedStudent(student)
        setShowConfirmModal(true)
      }
      setIsScanning(false)
    }, 2000)
  }

  // 确认签到
  const handleConfirmCheckin = () => {
    if (scannedStudent) {
      setStudents(prev => prev.map(s => 
        s.id === scannedStudent.id 
          ? { ...s, checkedIn: true, checkTime: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) }
          : s
      ))
      setShowConfirmModal(false)
      setShowSuccessAnimation(true)
      // 播放成功音效（模拟）
      setTimeout(() => setShowSuccessAnimation(false), 1500)
    }
  }

  // 手动搜索
  const handleSearch = (query: string) => {
    setSearchQuery(query)
    if (query.length >= 2) {
      const results = notCheckedInStudents.filter(s => 
        s.name.includes(query) || s.phone.includes(query)
      )
      setSearchResults(results)
    } else {
      setSearchResults([])
    }
  }

  // 手动签到
  const handleManualCheckin = (student: typeof studentsData[0]) => {
    setScannedStudent(student)
    setShowConfirmModal(true)
    setShowManualInput(false)
    setSearchQuery("")
    setSearchResults([])
  }

  return (
    <div className="min-h-screen bg-background pb-6">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border safe-area-pt">
        <div className="flex items-center justify-between px-4 h-14">
          <BackButton fallbackPath="/manage/station" />
          <h1 className="font-semibold text-base text-foreground">签到核销</h1>
          <div className="w-9" />
        </div>
      </header>

      {/* 今日课程信息 */}
      <div className="px-4 py-4">
        <Card className="p-4 bg-gradient-to-br from-primary/10 via-accent/5 to-background border-primary/20">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h2 className="font-semibold text-base text-foreground">{courseData.title}</h2>
              <p className="text-xs text-muted-foreground mt-1">{courseData.location}</p>
            </div>
            <Badge variant="secondary" className="bg-accent/20 text-accent border-0">
              进行中
            </Badge>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>{courseData.time}</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Users className="w-4 h-4" />
              <span>
                <span className="text-accent font-medium">{checkedInStudents.length}</span>
                /{courseData.totalEnrolled} 已签到
              </span>
            </div>
          </div>
          {/* 进度条 */}
          <div className="mt-3 h-2 bg-secondary rounded-full overflow-hidden">
            <div 
              className="h-full bg-accent rounded-full transition-all duration-500"
              style={{ width: `${(checkedInStudents.length / courseData.totalEnrolled) * 100}%` }}
            />
          </div>
        </Card>
      </div>

      {/* 扫码区域 */}
      <div className="px-4 pb-4">
        <Card className="p-6 text-center">
          <div 
            className={cn(
              "relative w-48 h-48 mx-auto rounded-2xl border-2 border-dashed flex items-center justify-center mb-4 transition-all",
              isScanning ? "border-accent bg-accent/5" : "border-border bg-secondary/30"
            )}
            onClick={handleStartScan}
          >
            {isScanning ? (
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin mb-3" />
                <p className="text-sm text-accent">扫描中...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center cursor-pointer">
                <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
                  <Camera className="w-10 h-10 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground">点击扫描学员二维码</p>
              </div>
            )}
            {/* 扫描框角标 */}
            <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-accent rounded-tl-lg" />
            <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-accent rounded-tr-lg" />
            <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-accent rounded-bl-lg" />
            <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-accent rounded-br-lg" />
          </div>

          {/* 手动签到入口 */}
          <button 
            onClick={() => setShowManualInput(!showManualInput)}
            className="flex items-center gap-2 mx-auto text-sm text-primary hover:underline"
          >
            <Keyboard className="w-4 h-4" />
            手动签到
          </button>

          {/* 手动输入区域 */}
          {showManualInput && (
            <div className="mt-4 text-left">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="输入学员手机号或昵称搜索"
                  className="w-full h-10 pl-10 pr-4 rounded-lg border border-border bg-secondary/50 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              {/* 搜索结果 */}
              {searchResults.length > 0 && (
                <div className="mt-2 space-y-2">
                  {searchResults.map(student => (
                    <Card 
                      key={student.id}
                      className="flex items-center justify-between p-3 cursor-pointer hover:bg-secondary/50"
                      onClick={() => handleManualCheckin(student)}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={student.avatar} alt={student.name} />
                          <AvatarFallback className="bg-secondary text-foreground">
                            {student.name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium text-foreground">{student.name}</p>
                          <p className="text-xs text-muted-foreground">{student.phone}</p>
                        </div>
                      </div>
                      <button className="px-3 py-1.5 bg-primary text-primary-foreground text-xs rounded-full">
                        签到
                      </button>
                    </Card>
                  ))}
                </div>
              )}
              {searchQuery.length >= 2 && searchResults.length === 0 && (
                <p className="mt-4 text-center text-sm text-muted-foreground">未找到相关学员</p>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* 签到列表 */}
      <div className="px-4 space-y-4">
        {/* 未签到学员 */}
        <Card className="overflow-hidden">
          <button 
            onClick={() => setShowNotCheckedIn(!showNotCheckedIn)}
            className="flex items-center justify-between w-full p-4 hover:bg-secondary/30 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/30">
                未签到
              </Badge>
              <span className="text-sm text-muted-foreground">{notCheckedInStudents.length}人</span>
            </div>
            {showNotCheckedIn ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
          {showNotCheckedIn && notCheckedInStudents.length > 0 && (
            <div className="border-t border-border divide-y divide-border">
              {notCheckedInStudents.map(student => (
                <div key={student.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={student.avatar} alt={student.name} />
                      <AvatarFallback className="bg-secondary text-foreground">
                        {student.name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium text-foreground">{student.name}</p>
                      <p className="text-xs text-muted-foreground">{student.phone}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleManualCheckin(student)}
                    className="px-3 py-1.5 border border-primary text-primary text-xs rounded-full hover:bg-primary/10"
                  >
                    手动签到
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* 已签到学员 */}
        <Card className="overflow-hidden">
          <button 
            onClick={() => setShowCheckedIn(!showCheckedIn)}
            className="flex items-center justify-between w-full p-4 hover:bg-secondary/30 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30">
                已签到
              </Badge>
              <span className="text-sm text-muted-foreground">{checkedInStudents.length}人</span>
            </div>
            {showCheckedIn ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
          {showCheckedIn && checkedInStudents.length > 0 && (
            <div className="border-t border-border divide-y divide-border">
              {checkedInStudents.map(student => (
                <div key={student.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={student.avatar} alt={student.name} />
                      <AvatarFallback className="bg-secondary text-foreground">
                        {student.name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium text-foreground">{student.name}</p>
                      <p className="text-xs text-muted-foreground">{student.phone}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-green-500">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{student.checkTime}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* 签到确认弹窗 */}
      {showConfirmModal && scannedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-[85%] max-w-sm bg-card rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <Avatar className="w-20 h-20 mx-auto mb-4 ring-4 ring-accent/30">
                <AvatarImage src={scannedStudent.avatar} alt={scannedStudent.name} />
                <AvatarFallback className="bg-secondary text-foreground text-2xl">
                  {scannedStudent.name[0]}
                </AvatarFallback>
              </Avatar>
              <h3 className="text-lg font-semibold text-foreground">{scannedStudent.name}</h3>
              <p className="text-sm text-muted-foreground mt-1">{scannedStudent.phone}</p>
              <p className="text-xs text-muted-foreground mt-2">报名时间：{scannedStudent.enrollTime}</p>
            </div>
            <div className="flex border-t border-border">
              <button 
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-4 text-sm text-muted-foreground hover:bg-secondary/50 transition-colors"
              >
                取消
              </button>
              <button 
                onClick={handleConfirmCheckin}
                className="flex-1 py-4 text-sm font-medium text-accent hover:bg-accent/10 transition-colors border-l border-border"
              >
                确认签到
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 签到成功动画 */}
      {showSuccessAnimation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 pointer-events-none">
          <div className="w-32 h-32 rounded-full bg-green-500 flex items-center justify-center animate-in zoom-in-50 duration-300">
            <Check className="w-16 h-16 text-white" strokeWidth={3} />
          </div>
        </div>
      )}
    </div>
  )
}
