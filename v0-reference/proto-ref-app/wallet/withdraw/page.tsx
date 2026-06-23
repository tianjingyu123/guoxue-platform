"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Wallet, CreditCard, Building2, AlertCircle, Check, ChevronRight, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { DataState } from "@/components/data-state"
import { getWithdrawBalance, applyWithdrawal, verifyPaymentPassword } from "@/lib/api/wallet"
import type { WithdrawBalanceInfo, WithdrawAccount, WithdrawMethod } from "@/lib/types/wallet"

export default function WithdrawPage() {
  const router = useRouter()
  const [balanceInfo, setBalanceInfo] = useState<WithdrawBalanceInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // 表单状态
  const [amount, setAmount] = useState("")
  const [method, setMethod] = useState<WithdrawMethod>("alipay")
  const [alipayAccount, setAlipayAccount] = useState("")
  const [alipayName, setAlipayName] = useState("")
  const [bankName, setBankName] = useState("")
  const [bankAccount, setBankAccount] = useState("")
  const [bankHolder, setBankHolder] = useState("")
  
  // 支付密码弹窗
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [password, setPassword] = useState(["", "", "", "", "", ""])
  const [verifying, setVerifying] = useState(false)
  const passwordInputRefs = useRef<(HTMLInputElement | null)[]>([])
  
  // 成功态
  const [success, setSuccess] = useState(false)
  const [withdrawResult, setWithdrawResult] = useState<{
    amount: number
    fee: number
    actualAmount: number
    estimatedArrival: string
  } | null>(null)

  // 加载提现余额信息
  useEffect(() => {
    loadBalanceInfo()
  }, [])

  const loadBalanceInfo = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await getWithdrawBalance()
      if (res.code === 200 && res.data) {
        setBalanceInfo(res.data)
        // 如果有保存的账户，自动填充
        const savedAccount = res.data.savedAccounts.find(a => a.method === method)
        if (savedAccount) {
          fillAccountInfo(savedAccount)
        }
      } else {
        setError(res.message || "加载失败")
      }
    } catch {
      setError("网络错误，请重试")
    } finally {
      setLoading(false)
    }
  }

  const fillAccountInfo = (account: WithdrawAccount) => {
    if (account.method === "alipay") {
      setAlipayAccount(account.alipayAccount || "")
      setAlipayName(account.alipayName || "")
    } else {
      setBankName(account.bankName || "")
      setBankAccount(account.bankAccount || "")
      setBankHolder(account.bankHolder || "")
    }
  }

  // 切换提现方式
  const handleMethodChange = (newMethod: WithdrawMethod) => {
    setMethod(newMethod)
    // 查找是否有保存的账户
    const savedAccount = balanceInfo?.savedAccounts.find(a => a.method === newMethod)
    if (savedAccount) {
      fillAccountInfo(savedAccount)
    } else {
      // 清空表单
      if (newMethod === "alipay") {
        setAlipayAccount("")
        setAlipayName("")
      } else {
        setBankName("")
        setBankAccount("")
        setBankHolder("")
      }
    }
  }

  // 计算手续费和到账金额
  const amountNum = parseFloat(amount) || 0
  const fee = balanceInfo ? Math.max(amountNum * balanceInfo.feeRate, balanceInfo.minFee) : 0
  const actualAmount = Math.max(amountNum - fee, 0)

  // 表单验证
  const isValidAmount = balanceInfo && amountNum >= balanceInfo.minWithdraw && amountNum <= balanceInfo.availableBalance && amountNum <= balanceInfo.maxWithdraw
  const isValidAccount = method === "alipay" 
    ? alipayAccount.trim() && alipayName.trim()
    : bankName.trim() && bankAccount.trim() && bankHolder.trim()
  const canSubmit = isValidAmount && isValidAccount

  // 全部提现
  const handleWithdrawAll = () => {
    if (balanceInfo) {
      setAmount(Math.min(balanceInfo.availableBalance, balanceInfo.maxWithdraw).toString())
    }
  }

  // 提交提现申请
  const handleSubmit = () => {
    if (!canSubmit) return
    setShowPasswordModal(true)
    setPassword(["", "", "", "", "", ""])
    setTimeout(() => {
      passwordInputRefs.current[0]?.focus()
    }, 100)
  }

  // 密码输入处理
  const handlePasswordInput = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return
    
    const newPassword = [...password]
    newPassword[index] = value.slice(-1)
    setPassword(newPassword)

    if (value && index < 5) {
      passwordInputRefs.current[index + 1]?.focus()
    }

    // 输入完成自动验证
    if (newPassword.every(p => p) && newPassword.join("").length === 6) {
      verifyAndSubmit(newPassword.join(""))
    }
  }

  const handlePasswordKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !password[index] && index > 0) {
      passwordInputRefs.current[index - 1]?.focus()
    }
  }

  // 验证密码并提交
  const verifyAndSubmit = async (pwd: string) => {
    setVerifying(true)
    try {
      const verifyRes = await verifyPaymentPassword(pwd)
      if (verifyRes.code !== 200 || !verifyRes.data?.valid) {
        toast.error(verifyRes.message || "支付密码错误")
        setPassword(["", "", "", "", "", ""])
        passwordInputRefs.current[0]?.focus()
        setVerifying(false)
        return
      }

      // 构建提现请求
      const account: WithdrawAccount = method === "alipay"
        ? { method: "alipay", alipayAccount, alipayName }
        : { method: "bank", bankName, bankAccount, bankHolder }

      const res = await applyWithdrawal({
        amount: amountNum,
        account,
        paymentPassword: pwd,
      })

      if (res.code === 200 && res.data) {
        setWithdrawResult({
          amount: res.data.amount,
          fee: res.data.fee,
          actualAmount: res.data.actualAmount,
          estimatedArrival: res.data.estimatedArrival,
        })
        setSuccess(true)
        setShowPasswordModal(false)
      } else {
        toast.error(res.message || "提现申请失败")
      }
    } catch {
      toast.error("网络错误，请重试")
    } finally {
      setVerifying(false)
    }
  }

  // 成功页面
  if (success && withdrawResult) {
    return (
      <div className="min-h-screen bg-[#FAF8F5]">
        <header className="sticky top-0 z-10 bg-[#FAF8F5] border-b border-[#C9A96E]/20">
          <div className="flex items-center h-14 px-4">
            <button onClick={() => router.push("/wallet")} className="p-2 -ml-2">
              <ArrowLeft className="w-5 h-5 text-[#2F1810]" />
            </button>
            <h1 className="flex-1 text-center text-lg font-medium text-[#2F1810]">提现结果</h1>
            <div className="w-9" />
          </div>
        </header>

        <div className="flex flex-col items-center px-4 pt-12">
          <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-semibold text-[#2F1810] mb-2">提现申请已提交</h2>
          <p className="text-[#5C4033]/70 mb-8">{withdrawResult.estimatedArrival}</p>

          <div className="w-full bg-white rounded-xl p-4 space-y-3">
            <div className="flex justify-between">
              <span className="text-[#5C4033]/70">提现金额</span>
              <span className="text-[#2F1810]">¥{withdrawResult.amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#5C4033]/70">手续费</span>
              <span className="text-[#2F1810]">-¥{withdrawResult.fee.toFixed(2)}</span>
            </div>
            <div className="h-px bg-[#C9A96E]/20" />
            <div className="flex justify-between">
              <span className="text-[#5C4033]/70">实际到账</span>
              <span className="text-lg font-semibold text-[#C41E3A]">¥{withdrawResult.actualAmount.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex gap-3 w-full mt-8">
            <Button
              variant="outline"
              className="flex-1 border-[#C9A96E] text-[#C9A96E]"
              onClick={() => router.push("/wallet")}
            >
              返回钱包
            </Button>
            <Button
              className="flex-1 bg-[#C41E3A] hover:bg-[#A31830] text-white"
              onClick={() => {
                setSuccess(false)
                setWithdrawResult(null)
                setAmount("")
                loadBalanceInfo()
              }}
            >
              继续提现
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-[#FAF8F5] border-b border-[#C9A96E]/20">
        <div className="flex items-center h-14 px-4">
          <button onClick={() => router.back()} className="p-2 -ml-2">
            <ArrowLeft className="w-5 h-5 text-[#2F1810]" />
          </button>
          <h1 className="flex-1 text-center text-lg font-medium text-[#2F1810]">提现</h1>
          <div className="w-9" />
        </div>
      </header>

      <DataState
        loading={loading}
        error={error}
        data={balanceInfo}
        skeleton={
          <div className="p-4 space-y-4">
            <div className="bg-white rounded-xl p-4 space-y-3">
              <div className="h-4 w-24 bg-[#C9A96E]/10 rounded animate-pulse" />
              <div className="h-8 w-32 bg-[#C9A96E]/10 rounded animate-pulse" />
            </div>
            <div className="bg-white rounded-xl p-4 space-y-3">
              <div className="h-4 w-20 bg-[#C9A96E]/10 rounded animate-pulse" />
              <div className="h-12 bg-[#C9A96E]/10 rounded animate-pulse" />
            </div>
          </div>
        }
        onRetry={loadBalanceInfo}
      >
        {balanceInfo && (
          <div className="p-4 space-y-4">
            {/* 可提现余额 */}
            <div className="bg-gradient-to-br from-[#C41E3A] to-[#8B1528] rounded-xl p-4 text-white">
              <div className="flex items-center gap-2 mb-2">
                <Wallet className="w-5 h-5 opacity-80" />
                <span className="text-sm opacity-80">可提现余额</span>
              </div>
              <div className="text-3xl font-bold mb-3">¥{balanceInfo.availableBalance.toFixed(2)}</div>
              <div className="flex gap-4 text-xs opacity-70">
                <span>冻结中: ¥{balanceInfo.frozenBalance.toFixed(2)}</span>
                <span>待结算: ¥{balanceInfo.pendingBalance.toFixed(2)}</span>
              </div>
            </div>

            {/* 提现金额 */}
            <div className="bg-white rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <Label className="text-[#2F1810] font-medium">提现金额</Label>
                <button
                  onClick={handleWithdrawAll}
                  className="text-sm text-[#C41E3A]"
                >
                  全部提现
                </button>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-2xl text-[#2F1810]">¥</span>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="pl-10 h-14 text-2xl font-semibold border-[#C9A96E]/30 focus:border-[#C41E3A] focus:ring-[#C41E3A]/20"
                />
              </div>
              <div className="flex items-center gap-1 mt-2 text-xs text-[#5C4033]/60">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>单笔最低{balanceInfo.minWithdraw}元，最高{balanceInfo.maxWithdraw}元</span>
              </div>
            </div>

            {/* 收款方式 */}
            <div className="bg-white rounded-xl p-4">
              <Label className="text-[#2F1810] font-medium mb-3 block">收款方式</Label>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <button
                  onClick={() => handleMethodChange("alipay")}
                  className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-colors ${
                    method === "alipay"
                      ? "border-[#C41E3A] bg-[#C41E3A]/5"
                      : "border-[#C9A96E]/30"
                  }`}
                >
                  <CreditCard className={`w-5 h-5 ${method === "alipay" ? "text-[#C41E3A]" : "text-[#5C4033]/60"}`} />
                  <span className={method === "alipay" ? "text-[#C41E3A]" : "text-[#5C4033]"}>支付宝</span>
                </button>
                <button
                  onClick={() => handleMethodChange("bank")}
                  className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-colors ${
                    method === "bank"
                      ? "border-[#C41E3A] bg-[#C41E3A]/5"
                      : "border-[#C9A96E]/30"
                  }`}
                >
                  <Building2 className={`w-5 h-5 ${method === "bank" ? "text-[#C41E3A]" : "text-[#5C4033]/60"}`} />
                  <span className={method === "bank" ? "text-[#C41E3A]" : "text-[#5C4033]"}>银行卡</span>
                </button>
              </div>

              {/* 支付宝表单 */}
              {method === "alipay" && (
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm text-[#5C4033]/70 mb-1.5 block">支付宝账号</Label>
                    <Input
                      value={alipayAccount}
                      onChange={(e) => setAlipayAccount(e.target.value)}
                      placeholder="请输入支付宝账号"
                      className="border-[#C9A96E]/30"
                    />
                  </div>
                  <div>
                    <Label className="text-sm text-[#5C4033]/70 mb-1.5 block">真实姓名</Label>
                    <Input
                      value={alipayName}
                      onChange={(e) => setAlipayName(e.target.value)}
                      placeholder="请输入支付宝实名姓名"
                      className="border-[#C9A96E]/30"
                    />
                  </div>
                </div>
              )}

              {/* 银行卡表单 */}
              {method === "bank" && (
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm text-[#5C4033]/70 mb-1.5 block">开户银行</Label>
                    <Input
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="请输入开户银行名称"
                      className="border-[#C9A96E]/30"
                    />
                  </div>
                  <div>
                    <Label className="text-sm text-[#5C4033]/70 mb-1.5 block">银行卡号</Label>
                    <Input
                      value={bankAccount}
                      onChange={(e) => setBankAccount(e.target.value)}
                      placeholder="请输入银行卡号"
                      className="border-[#C9A96E]/30"
                    />
                  </div>
                  <div>
                    <Label className="text-sm text-[#5C4033]/70 mb-1.5 block">持卡人姓名</Label>
                    <Input
                      value={bankHolder}
                      onChange={(e) => setBankHolder(e.target.value)}
                      placeholder="请输入持卡人姓名"
                      className="border-[#C9A96E]/30"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 费用预览 */}
            {amountNum > 0 && (
              <div className="bg-white rounded-xl p-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-[#5C4033]/70">提现金额</span>
                  <span className="text-[#2F1810]">¥{amountNum.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-[#5C4033]/70">手续费 ({(balanceInfo.feeRate * 100).toFixed(1)}%，最低{balanceInfo.minFee}元)</span>
                  <span className="text-[#2F1810]">-¥{fee.toFixed(2)}</span>
                </div>
                <div className="h-px bg-[#C9A96E]/20 my-2" />
                <div className="flex justify-between">
                  <span className="text-[#5C4033]/70">预计到账</span>
                  <span className="text-lg font-semibold text-[#C41E3A]">¥{actualAmount.toFixed(2)}</span>
                </div>
              </div>
            )}

            {/* 提交按钮 */}
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="w-full h-12 bg-[#C41E3A] hover:bg-[#A31830] text-white disabled:opacity-50"
            >
              确认提现
            </Button>

            {/* 提示信息 */}
            <div className="text-xs text-[#5C4033]/60 space-y-1">
              <p>• 支付宝提现预计2小时内到账</p>
              <p>• 银行卡提现预计1-3个工作日到账</p>
              <p>• 请确保收款账户信息准确无误</p>
            </div>
          </div>
        )}
      </DataState>

      {/* 支付密码弹窗 */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
          <div className="w-full bg-white rounded-t-2xl p-4 animate-in slide-in-from-bottom">
            <div className="flex items-center justify-between mb-6">
              <div className="w-8" />
              <h3 className="text-lg font-medium text-[#2F1810]">请输入支付密码</h3>
              <button onClick={() => setShowPasswordModal(false)} className="p-1">
                <X className="w-5 h-5 text-[#5C4033]/60" />
              </button>
            </div>

            <div className="flex justify-center gap-3 mb-6">
              {password.map((p, i) => (
                <div key={i} className="relative">
                  <input
                    ref={(el) => { passwordInputRefs.current[i] = el }}
                    type="password"
                    inputMode="numeric"
                    maxLength={1}
                    value={p}
                    onChange={(e) => handlePasswordInput(i, e.target.value)}
                    onKeyDown={(e) => handlePasswordKeyDown(i, e)}
                    disabled={verifying}
                    className="w-12 h-14 text-center text-2xl font-bold border-2 border-[#C9A96E]/30 rounded-lg focus:border-[#C41E3A] focus:outline-none disabled:opacity-50"
                  />
                  {p && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-3 h-3 bg-[#2F1810] rounded-full" />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {verifying && (
              <div className="flex items-center justify-center gap-2 text-[#5C4033]/70">
                <div className="w-4 h-4 border-2 border-[#C41E3A] border-t-transparent rounded-full animate-spin" />
                <span>验证中...</span>
              </div>
            )}

            <button className="w-full text-center text-sm text-[#C41E3A] mt-4 py-2">
              忘记支付密码？
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
