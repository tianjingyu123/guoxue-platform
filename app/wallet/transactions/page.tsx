"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, ChevronDown, ArrowUpRight, ArrowDownLeft, ShoppingBag, Gift, RefreshCw, CreditCard, Wallet, Send, HelpCircle } from "lucide-react"
import { walletApi, type WalletTransaction, type WalletBalance } from "@/lib/api"

// Mock数据
const mockBalance: WalletBalance = {
  coin: 2580,
  points: 12600,
  frozen: 100
}

const mockTransactions: WalletTransaction[] = [
  { id: "1", type: "expense", category: "purchase", title: "购买课程", description: "紫微斗数入门精讲", amount: -299, balance: 2580, createdAt: "2024-01-15T14:30:00Z", orderNo: "202401151430001" },
  { id: "2", type: "income", category: "refund", title: "退款到账", description: "订单退款", amount: 199, balance: 2879, createdAt: "2024-01-14T10:20:00Z", orderNo: "202401141020001" },
  { id: "3", type: "income", category: "recharge", title: "充值学习币", description: "微信支付充值", amount: 500, balance: 2680, createdAt: "2024-01-13T09:15:00Z" },
  { id: "4", type: "expense", category: "purchase", title: "购买商品", description: "周易六十四卦详解", amount: -168, balance: 2180, createdAt: "2024-01-12T16:45:00Z", orderNo: "202401121645001" },
  { id: "5", type: "income", category: "reward", title: "签到奖励", description: "连续签到7天奖励", amount: 50, balance: 2348, createdAt: "2024-01-11T08:00:00Z" },
  { id: "6", type: "expense", category: "transfer", title: "打赏作者", description: "打赏文章《八字命理基础》", amount: -20, balance: 2298, createdAt: "2024-01-10T20:30:00Z" },
]

const categoryIcons: Record<string, React.ReactNode> = {
  purchase: <ShoppingBag className="w-4 h-4" />,
  refund: <RefreshCw className="w-4 h-4" />,
  reward: <Gift className="w-4 h-4" />,
  recharge: <CreditCard className="w-4 h-4" />,
  withdraw: <Wallet className="w-4 h-4" />,
  transfer: <Send className="w-4 h-4" />,
  other: <HelpCircle className="w-4 h-4" />,
}

const categoryColors: Record<string, string> = {
  purchase: "bg-blue-100 text-blue-600",
  refund: "bg-green-100 text-green-600",
  reward: "bg-yellow-100 text-yellow-600",
  recharge: "bg-purple-100 text-purple-600",
  withdraw: "bg-orange-100 text-orange-600",
  transfer: "bg-pink-100 text-pink-600",
  other: "bg-gray-100 text-gray-600",
}

export default function WalletTransactionsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [balance, setBalance] = useState<WalletBalance | null>(null)
  const [transactions, setTransactions] = useState<WalletTransaction[]>([])
  const [filterType, setFilterType] = useState<string>("")
  const [selectedMonth, setSelectedMonth] = useState<string>("")
  const [showMonthPicker, setShowMonthPicker] = useState(false)
  const [showTypePicker, setShowTypePicker] = useState(false)

  // 生成最近12个月
  const months = Array.from({ length: 12 }, (_, i) => {
    const date = new Date()
    date.setMonth(date.getMonth() - i)
    return {
      value: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
      label: `${date.getFullYear()}年${date.getMonth() + 1}月`
    }
  })

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const [balanceRes, transRes] = await Promise.all([
          walletApi.getBalance(),
          walletApi.getTransactions({ type: filterType, month: selectedMonth })
        ])
        setBalance(balanceRes)
        setTransactions(transRes.data)
      } catch {
        setBalance(mockBalance)
        // 根据筛选条件过滤mock数据
        let filtered = mockTransactions
        if (filterType) {
          filtered = filtered.filter(t => t.type === filterType)
        }
        setTransactions(filtered)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [filterType, selectedMonth])

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return `${date.getMonth() + 1}月${date.getDate()}日 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  }

  // 按日期分组
  const groupedTransactions = transactions.reduce((groups, transaction) => {
    const date = new Date(transaction.createdAt)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    if (!groups[key]) {
      groups[key] = { date: key, items: [] }
    }
    groups[key].items.push(transaction)
    return groups
  }, {} as Record<string, { date: string; items: WalletTransaction[] }>)

  const groupedList = Object.values(groupedTransactions).sort((a, b) => b.date.localeCompare(a.date))

  const formatGroupDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-')
    const today = new Date()
    const targetDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
    const diffDays = Math.floor((today.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return "今天"
    if (diffDays === 1) return "昨天"
    return `${month}月${day}日`
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-10 bg-gradient-to-r from-[#C41E3A] to-[#E85A6B] text-white px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1 -ml-1">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <span className="text-lg font-medium">交易记录</span>
        </div>
      </div>

      {/* 余额卡片 */}
      {balance && (
        <div className="mx-4 mt-4 bg-gradient-to-br from-[#C41E3A] to-[#E85A6B] rounded-2xl p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/70 text-sm">学习币余额</p>
              <p className="text-3xl font-bold mt-1">{balance.coin.toLocaleString()}</p>
              {balance.frozen > 0 && (
                <p className="text-xs text-white/60 mt-1">冻结: {balance.frozen}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-white/70 text-sm">积分</p>
              <p className="text-xl font-medium mt-1">{balance.points.toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}

      {/* 筛选栏 */}
      <div className="sticky top-12 z-10 bg-[#FAF8F5] px-4 py-3 flex items-center gap-3 border-b border-[#E8E3DB]">
        {/* 月份选择 */}
        <div className="relative">
          <button
            onClick={() => { setShowMonthPicker(!showMonthPicker); setShowTypePicker(false) }}
            className="flex items-center gap-1 px-3 py-1.5 bg-white rounded-full text-sm border border-[#E8E3DB]"
          >
            <span>{selectedMonth ? months.find(m => m.value === selectedMonth)?.label : "全部月份"}</span>
            <ChevronDown className="w-4 h-4 text-[#999999]" />
          </button>
          {showMonthPicker && (
            <div className="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-lg border border-[#E8E3DB] py-1 z-20 max-h-64 overflow-y-auto">
              <button
                onClick={() => { setSelectedMonth(""); setShowMonthPicker(false) }}
                className={`w-full px-4 py-2 text-left text-sm ${!selectedMonth ? "text-[#C41E3A] bg-red-50" : "text-[#2C2C2C]"}`}
              >
                全部月份
              </button>
              {months.map(month => (
                <button
                  key={month.value}
                  onClick={() => { setSelectedMonth(month.value); setShowMonthPicker(false) }}
                  className={`w-full px-4 py-2 text-left text-sm whitespace-nowrap ${selectedMonth === month.value ? "text-[#C41E3A] bg-red-50" : "text-[#2C2C2C]"}`}
                >
                  {month.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 类型筛选 */}
        <div className="relative">
          <button
            onClick={() => { setShowTypePicker(!showTypePicker); setShowMonthPicker(false) }}
            className="flex items-center gap-1 px-3 py-1.5 bg-white rounded-full text-sm border border-[#E8E3DB]"
          >
            <span>{filterType === "income" ? "收入" : filterType === "expense" ? "支出" : "全部类型"}</span>
            <ChevronDown className="w-4 h-4 text-[#999999]" />
          </button>
          {showTypePicker && (
            <div className="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-lg border border-[#E8E3DB] py-1 z-20">
              {[
                { value: "", label: "全部类型" },
                { value: "income", label: "收入" },
                { value: "expense", label: "支出" },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { setFilterType(opt.value); setShowTypePicker(false) }}
                  className={`w-full px-4 py-2 text-left text-sm whitespace-nowrap ${filterType === opt.value ? "text-[#C41E3A] bg-red-50" : "text-[#2C2C2C]"}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 交易列表 */}
      <div className="px-4 py-4">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="bg-white rounded-xl p-4 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full" />
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-24 mb-2" />
                    <div className="h-3 bg-gray-200 rounded w-32" />
                  </div>
                  <div className="h-5 bg-gray-200 rounded w-16" />
                </div>
              </div>
            ))}
          </div>
        ) : groupedList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Wallet className="w-10 h-10 text-gray-300" />
            </div>
            <p className="text-[#999999]">暂无交易记录</p>
          </div>
        ) : (
          <div className="space-y-6">
            {groupedList.map(group => (
              <div key={group.date}>
                <p className="text-sm text-[#999999] mb-2">{formatGroupDate(group.date)}</p>
                <div className="bg-white rounded-2xl overflow-hidden">
                  {group.items.map((transaction, idx) => (
                    <button
                      key={transaction.id}
                      onClick={() => router.push(`/wallet/transactions/${transaction.id}`)}
                      className={`w-full flex items-center gap-3 p-4 text-left ${idx > 0 ? "border-t border-[#E8E3DB]" : ""}`}
                    >
                      {/* 图标 */}
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${categoryColors[transaction.category]}`}>
                        {categoryIcons[transaction.category]}
                      </div>

                      {/* 信息 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-[#2C2C2C]">{transaction.title}</span>
                          {transaction.type === "income" ? (
                            <ArrowDownLeft className="w-3.5 h-3.5 text-green-500" />
                          ) : (
                            <ArrowUpRight className="w-3.5 h-3.5 text-red-500" />
                          )}
                        </div>
                        <p className="text-sm text-[#999999] truncate">{transaction.description}</p>
                        <p className="text-xs text-[#999999] mt-0.5">{formatDate(transaction.createdAt)}</p>
                      </div>

                      {/* 金额 */}
                      <div className="text-right">
                        <p className={`font-semibold ${transaction.type === "income" ? "text-green-600" : "text-[#2C2C2C]"}`}>
                          {transaction.type === "income" ? "+" : ""}{transaction.amount.toLocaleString()}
                        </p>
                        <p className="text-xs text-[#999999]">余额 {transaction.balance.toLocaleString()}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 点击外部关闭弹窗 */}
      {(showMonthPicker || showTypePicker) && (
        <div 
          className="fixed inset-0 z-10" 
          onClick={() => { setShowMonthPicker(false); setShowTypePicker(false) }}
        />
      )}
    </div>
  )
}
