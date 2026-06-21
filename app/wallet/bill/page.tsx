"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, ChevronRight, Download, ShoppingBag, BookOpen, Users, CreditCard, ArrowUpRight, Gift, ChevronDown, ChevronUp } from "lucide-react"
import { walletApi, type BillSummary, type BillCategory } from "@/lib/api"

// Mock数据
const mockBill: BillSummary = {
  period: "2024-01",
  periodType: "month",
  totalIncome: 2580,
  totalExpense: 1890,
  balance: 690,
  categories: [
    {
      category: "course",
      name: "课程学习",
      icon: "BookOpen",
      color: "#C41E3A",
      amount: 680,
      percent: 36,
      type: "expense",
      count: 3,
      items: [
        { id: "1", title: "周易六十四卦详解", amount: 298, createdAt: "2024-01-15 14:30" },
        { id: "2", title: "紫微斗数入门到精通", amount: 198, createdAt: "2024-01-12 10:20" },
        { id: "3", title: "奇门遁甲实战课程", amount: 184, createdAt: "2024-01-08 16:45" },
      ]
    },
    {
      category: "shopping",
      name: "商品购物",
      icon: "ShoppingBag",
      color: "#E85D04",
      amount: 520,
      percent: 28,
      type: "expense",
      count: 2,
      items: [
        { id: "4", title: "罗盘专业版", amount: 320, createdAt: "2024-01-20 09:15" },
        { id: "5", title: "风水入门书籍套装", amount: 200, createdAt: "2024-01-05 11:30" },
      ]
    },
    {
      category: "group",
      name: "拼团活动",
      icon: "Users",
      color: "#2196F3",
      amount: 380,
      percent: 20,
      type: "expense",
      count: 2,
      items: [
        { id: "6", title: "八字命理精讲(拼团)", amount: 199, createdAt: "2024-01-18 20:00" },
        { id: "7", title: "梅花易数入门(拼团)", amount: 181, createdAt: "2024-01-10 15:30" },
      ]
    },
    {
      category: "recharge",
      name: "充值",
      icon: "CreditCard",
      color: "#4CAF50",
      amount: 2000,
      percent: 78,
      type: "income",
      count: 2,
      items: [
        { id: "8", title: "学习币充值", amount: 1000, createdAt: "2024-01-01 10:00" },
        { id: "9", title: "学习币充值", amount: 1000, createdAt: "2024-01-15 10:00" },
      ]
    },
    {
      category: "reward",
      name: "奖励收入",
      icon: "Gift",
      color: "#C9A96E",
      amount: 580,
      percent: 22,
      type: "income",
      count: 5,
      items: [
        { id: "10", title: "邀请好友奖励", amount: 200, createdAt: "2024-01-22 12:00" },
        { id: "11", title: "签到奖励", amount: 100, createdAt: "2024-01-20 08:00" },
        { id: "12", title: "创作收益", amount: 280, createdAt: "2024-01-18 16:00" },
      ]
    },
  ]
}

const iconMap: Record<string, React.ReactNode> = {
  ShoppingBag: <ShoppingBag className="w-5 h-5" />,
  BookOpen: <BookOpen className="w-5 h-5" />,
  Users: <Users className="w-5 h-5" />,
  CreditCard: <CreditCard className="w-5 h-5" />,
  ArrowUpRight: <ArrowUpRight className="w-5 h-5" />,
  Gift: <Gift className="w-5 h-5" />,
}

export default function BillDetailPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [bill, setBill] = useState<BillSummary | null>(null)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewType, setViewType] = useState<'month' | 'year'>('month')
  const [expandedCategories, setExpandedCategories] = useState<string[]>([])
  const [exporting, setExporting] = useState(false)

  const periodStr = viewType === 'month' 
    ? `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`
    : `${currentDate.getFullYear()}`

  useEffect(() => {
    loadBill()
  }, [periodStr])

  const loadBill = async () => {
    setLoading(true)
    try {
      // const data = await walletApi.getBillSummary(periodStr)
      // setBill(data)
      await new Promise(r => setTimeout(r, 500))
      setBill({ ...mockBill, period: periodStr })
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handlePrevPeriod = () => {
    const newDate = new Date(currentDate)
    if (viewType === 'month') {
      newDate.setMonth(newDate.getMonth() - 1)
    } else {
      newDate.setFullYear(newDate.getFullYear() - 1)
    }
    setCurrentDate(newDate)
  }

  const handleNextPeriod = () => {
    const newDate = new Date(currentDate)
    if (viewType === 'month') {
      newDate.setMonth(newDate.getMonth() + 1)
    } else {
      newDate.setFullYear(newDate.getFullYear() + 1)
    }
    if (newDate <= new Date()) {
      setCurrentDate(newDate)
    }
  }

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    )
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      // const { downloadUrl } = await walletApi.exportBill(periodStr)
      // window.open(downloadUrl)
      await new Promise(r => setTimeout(r, 1000))
      alert("账单导出成功，请查看下载文件")
    } catch (error) {
      console.error(error)
    } finally {
      setExporting(false)
    }
  }

  const formatPeriod = () => {
    if (viewType === 'month') {
      return `${currentDate.getFullYear()}年${currentDate.getMonth() + 1}月`
    }
    return `${currentDate.getFullYear()}年`
  }

  const incomeCategories = bill?.categories.filter(c => c.type === 'income') || []
  const expenseCategories = bill?.categories.filter(c => c.type === 'expense') || []

  // 圆环图计算
  const total = (bill?.totalIncome || 0) + (bill?.totalExpense || 0)
  const incomePercent = total > 0 ? ((bill?.totalIncome || 0) / total) * 100 : 50
  const circumference = 2 * Math.PI * 45

  return (
    <div className="min-h-screen bg-[#FAF8F5] pb-24">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-10 bg-gradient-to-r from-[#C41E3A] to-[#A01830] text-white px-4 py-3 flex items-center justify-between">
        <button onClick={() => router.back()} className="p-1">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <span className="font-semibold">账单详情</span>
        <button 
          onClick={handleExport} 
          disabled={exporting}
          className="p-1 disabled:opacity-50"
        >
          <Download className="w-5 h-5" />
        </button>
      </div>

      {/* 周期选择 */}
      <div className="bg-white px-4 py-3 border-b border-[#E8E3DB]">
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => setViewType('month')}
              className={`px-3 py-1 rounded-full text-sm ${
                viewType === 'month' 
                  ? 'bg-[#C41E3A] text-white' 
                  : 'bg-[#FAF8F5] text-[#666666]'
              }`}
            >
              月账单
            </button>
            <button
              onClick={() => setViewType('year')}
              className={`px-3 py-1 rounded-full text-sm ${
                viewType === 'year' 
                  ? 'bg-[#C41E3A] text-white' 
                  : 'bg-[#FAF8F5] text-[#666666]'
              }`}
            >
              年账单
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handlePrevPeriod} className="p-1">
              <ChevronLeft className="w-5 h-5 text-[#666666]" />
            </button>
            <span className="text-[#2C2C2C] font-medium min-w-[100px] text-center">
              {formatPeriod()}
            </span>
            <button 
              onClick={handleNextPeriod} 
              className="p-1"
              disabled={
                viewType === 'month' 
                  ? currentDate.getMonth() >= new Date().getMonth() && currentDate.getFullYear() >= new Date().getFullYear()
                  : currentDate.getFullYear() >= new Date().getFullYear()
              }
            >
              <ChevronRight className="w-5 h-5 text-[#666666]" />
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="p-4 space-y-4">
          <div className="bg-white rounded-2xl p-6 h-64 animate-pulse" />
          <div className="bg-white rounded-2xl p-4 h-40 animate-pulse" />
        </div>
      ) : bill && (
        <>
          {/* 收支概览 */}
          <div className="p-4">
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between">
                {/* 圆环图 */}
                <div className="relative w-32 h-32">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="64"
                      cy="64"
                      r="45"
                      fill="none"
                      stroke="#E8E3DB"
                      strokeWidth="12"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r="45"
                      fill="none"
                      stroke="#4CAF50"
                      strokeWidth="12"
                      strokeDasharray={circumference}
                      strokeDashoffset={circumference * (1 - incomePercent / 100)}
                      strokeLinecap="round"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r="45"
                      fill="none"
                      stroke="#C41E3A"
                      strokeWidth="12"
                      strokeDasharray={circumference}
                      strokeDashoffset={circumference * incomePercent / 100}
                      strokeLinecap="round"
                      style={{ transform: `rotate(${incomePercent * 3.6}deg)`, transformOrigin: '64px 64px' }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xs text-[#999999]">结余</span>
                    <span className={`text-lg font-bold ${bill.balance >= 0 ? 'text-[#4CAF50]' : 'text-[#C41E3A]'}`}>
                      {bill.balance >= 0 ? '+' : ''}{bill.balance}
                    </span>
                  </div>
                </div>

                {/* 收支数据 */}
                <div className="flex-1 ml-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-[#4CAF50]" />
                      <span className="text-[#666666] text-sm">收入</span>
                    </div>
                    <span className="text-[#4CAF50] font-semibold">+{bill.totalIncome.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-[#C41E3A]" />
                      <span className="text-[#666666] text-sm">支出</span>
                    </div>
                    <span className="text-[#C41E3A] font-semibold">-{bill.totalExpense.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 支出分类 */}
          {expenseCategories.length > 0 && (
            <div className="px-4 mb-4">
              <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
                <div className="px-4 py-3 border-b border-[#E8E3DB]">
                  <span className="font-semibold text-[#2C2C2C]">支出分类</span>
                </div>
                {expenseCategories.map((cat, index) => (
                  <CategoryItem 
                    key={cat.category}
                    category={cat}
                    isExpanded={expandedCategories.includes(cat.category)}
                    onToggle={() => toggleCategory(cat.category)}
                    isLast={index === expenseCategories.length - 1}
                  />
                ))}
              </div>
            </div>
          )}

          {/* 收入分类 */}
          {incomeCategories.length > 0 && (
            <div className="px-4 mb-4">
              <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
                <div className="px-4 py-3 border-b border-[#E8E3DB]">
                  <span className="font-semibold text-[#2C2C2C]">收入分类</span>
                </div>
                {incomeCategories.map((cat, index) => (
                  <CategoryItem 
                    key={cat.category}
                    category={cat}
                    isExpanded={expandedCategories.includes(cat.category)}
                    onToggle={() => toggleCategory(cat.category)}
                    isLast={index === incomeCategories.length - 1}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* 底部固定按钮 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E8E3DB] p-4 safe-area-pb">
        <button
          onClick={handleExport}
          disabled={exporting}
          className="w-full py-3 bg-[#C41E3A] text-white rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Download className="w-5 h-5" />
          {exporting ? '导出中...' : '导出账单PDF'}
        </button>
      </div>
    </div>
  )
}

function CategoryItem({ 
  category, 
  isExpanded, 
  onToggle,
  isLast 
}: { 
  category: BillCategory
  isExpanded: boolean
  onToggle: () => void
  isLast: boolean
}) {
  return (
    <div className={!isLast ? 'border-b border-[#E8E3DB]' : ''}>
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-[#FAF8F5] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ backgroundColor: `${category.color}15`, color: category.color }}
          >
            {iconMap[category.icon] || <ShoppingBag className="w-5 h-5" />}
          </div>
          <div className="text-left">
            <p className="text-[#2C2C2C] font-medium">{category.name}</p>
            <p className="text-xs text-[#999999]">{category.count}笔交易</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <p className={`font-semibold ${category.type === 'income' ? 'text-[#4CAF50]' : 'text-[#2C2C2C]'}`}>
              {category.type === 'income' ? '+' : '-'}{category.amount.toFixed(2)}
            </p>
            <p className="text-xs text-[#999999]">占比{category.percent}%</p>
          </div>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-[#999999]" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[#999999]" />
          )}
        </div>
      </button>
      
      {isExpanded && (
        <div className="bg-[#FAF8F5] px-4 py-2">
          {category.items.map((item, idx) => (
            <div 
              key={item.id}
              className={`py-2 flex items-center justify-between ${
                idx !== category.items.length - 1 ? 'border-b border-[#E8E3DB]' : ''
              }`}
            >
              <div>
                <p className="text-sm text-[#2C2C2C]">{item.title}</p>
                <p className="text-xs text-[#999999]">{item.createdAt}</p>
              </div>
              <span className={`text-sm font-medium ${
                category.type === 'income' ? 'text-[#4CAF50]' : 'text-[#2C2C2C]'
              }`}>
                {category.type === 'income' ? '+' : '-'}{item.amount.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
