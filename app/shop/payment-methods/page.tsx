"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Plus, Check, CreditCard, Smartphone, MoreVertical, Trash2, Star, AlertCircle } from "lucide-react"
import { paymentMethodApi, type PaymentMethod } from "@/lib/api"

// Mock数据
const mockMethods: PaymentMethod[] = [
  { id: "1", type: "wechat", name: "微信支付", icon: "wechat", account: "wei***@example.com", isDefault: true, bindTime: "2024-01-15" },
  { id: "2", type: "alipay", name: "支付宝", icon: "alipay", account: "138****8888", isDefault: false, bindTime: "2024-02-20" },
  { id: "3", type: "bank_card", name: "招商银行", icon: "bank", account: "**** **** **** 6789", isDefault: false, bindTime: "2024-03-10", bankName: "招商银行", cardType: "debit" },
]

export default function PaymentMethodsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [methods, setMethods] = useState<PaymentMethod[]>([])
  const [showMenu, setShowMenu] = useState<string | null>(null)
  const [showAddPanel, setShowAddPanel] = useState(false)
  const [showConfirm, setShowConfirm] = useState<{ id: string; action: "delete" | "default" } | null>(null)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    loadMethods()
  }, [])

  const loadMethods = async () => {
    setLoading(true)
    try {
      const data = await paymentMethodApi.list()
      setMethods(data)
    } catch {
      setMethods(mockMethods)
    } finally {
      setLoading(false)
    }
  }

  const handleSetDefault = async (id: string) => {
    setProcessing(true)
    try {
      await paymentMethodApi.setDefault(id)
      setMethods(prev => prev.map(m => ({ ...m, isDefault: m.id === id })))
    } catch {
      setMethods(prev => prev.map(m => ({ ...m, isDefault: m.id === id })))
    } finally {
      setProcessing(false)
      setShowConfirm(null)
      setShowMenu(null)
    }
  }

  const handleRemove = async (id: string) => {
    setProcessing(true)
    try {
      await paymentMethodApi.remove(id)
      setMethods(prev => prev.filter(m => m.id !== id))
    } catch {
      setMethods(prev => prev.filter(m => m.id !== id))
    } finally {
      setProcessing(false)
      setShowConfirm(null)
      setShowMenu(null)
    }
  }

  const getMethodIcon = (type: string) => {
    switch (type) {
      case "wechat":
        return (
          <div className="w-10 h-10 rounded-full bg-[#07C160] flex items-center justify-center">
            <Smartphone className="w-5 h-5 text-white" />
          </div>
        )
      case "alipay":
        return (
          <div className="w-10 h-10 rounded-full bg-[#1677FF] flex items-center justify-center">
            <Smartphone className="w-5 h-5 text-white" />
          </div>
        )
      case "bank_card":
        return (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#C41E3A] to-[#8B0000] flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-white" />
          </div>
        )
      default:
        return (
          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-gray-500" />
          </div>
        )
    }
  }

  const addOptions = [
    { type: "wechat", name: "微信支付", desc: "绑定微信账号快捷支付", icon: <Smartphone className="w-5 h-5 text-[#07C160]" /> },
    { type: "alipay", name: "支付宝", desc: "绑定支付宝账号快捷支付", icon: <Smartphone className="w-5 h-5 text-[#1677FF]" /> },
    { type: "bank_card", name: "银行卡", desc: "添加储蓄卡或信用卡", icon: <CreditCard className="w-5 h-5 text-[#C41E3A]" /> },
  ]

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-10 bg-white border-b border-[#E8E3DB] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1 -ml-1">
            <ChevronLeft className="w-6 h-6 text-[#2C2C2C]" />
          </button>
          <h1 className="text-lg font-semibold text-[#2C2C2C]">支付方式</h1>
        </div>
        <button
          onClick={() => setShowAddPanel(true)}
          className="flex items-center gap-1 text-sm text-[#C41E3A]"
        >
          <Plus className="w-4 h-4" />
          添加
        </button>
      </div>

      {/* 支付方式列表 */}
      <div className="p-4 space-y-3">
        {loading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-24" />
                  <div className="h-3 bg-gray-200 rounded w-32" />
                </div>
              </div>
            </div>
          ))
        ) : methods.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#FAF8F5] flex items-center justify-center">
              <CreditCard className="w-8 h-8 text-[#999999]" />
            </div>
            <p className="text-[#999999] mb-4">暂未绑定支付方式</p>
            <button
              onClick={() => setShowAddPanel(true)}
              className="px-6 py-2 bg-[#C41E3A] text-white rounded-full text-sm"
            >
              添加支付方式
            </button>
          </div>
        ) : (
          methods.map(method => (
            <div key={method.id} className="bg-white rounded-2xl p-4 relative">
              <div className="flex items-center gap-3">
                {getMethodIcon(method.type)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-[#2C2C2C]">{method.name}</span>
                    {method.cardType && (
                      <span className="text-xs px-1.5 py-0.5 bg-[#FAF8F5] text-[#666666] rounded">
                        {method.cardType === "debit" ? "储蓄卡" : "信用卡"}
                      </span>
                    )}
                    {method.isDefault && (
                      <span className="text-xs px-1.5 py-0.5 bg-[#C41E3A]/10 text-[#C41E3A] rounded">
                        默认
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-[#999999] mt-0.5">{method.account}</p>
                </div>
                <button
                  onClick={() => setShowMenu(showMenu === method.id ? null : method.id)}
                  className="p-2 -mr-2"
                >
                  <MoreVertical className="w-5 h-5 text-[#999999]" />
                </button>
              </div>

              {/* 操作菜单 */}
              {showMenu === method.id && (
                <div className="absolute right-4 top-14 bg-white rounded-xl shadow-lg border border-[#E8E3DB] py-1 z-10 min-w-[120px]">
                  {!method.isDefault && (
                    <button
                      onClick={() => setShowConfirm({ id: method.id, action: "default" })}
                      className="w-full px-4 py-2 text-left text-sm text-[#2C2C2C] hover:bg-[#FAF8F5] flex items-center gap-2"
                    >
                      <Star className="w-4 h-4 text-[#C9A96E]" />
                      设为默认
                    </button>
                  )}
                  <button
                    onClick={() => setShowConfirm({ id: method.id, action: "delete" })}
                    className="w-full px-4 py-2 text-left text-sm text-[#C41E3A] hover:bg-[#FAF8F5] flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    解除绑定
                  </button>
                </div>
              )}

              <div className="mt-3 pt-3 border-t border-[#E8E3DB] flex items-center justify-between text-xs text-[#999999]">
                <span>绑定时间：{method.bindTime}</span>
                {method.isDefault && (
                  <span className="flex items-center gap-1 text-[#07C160]">
                    <Check className="w-3 h-3" />
                    支付时优先使用
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* 安全提示 */}
      <div className="px-4 pb-4">
        <div className="flex items-start gap-2 text-xs text-[#999999]">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>您的支付信息已加密存储，我们不会保存您的支付密码。如有疑问请联系客服。</p>
        </div>
      </div>

      {/* 添加支付方式面板 */}
      {showAddPanel && (
        <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setShowAddPanel(false)}>
          <div
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 border-b border-[#E8E3DB]">
              <h3 className="text-lg font-semibold text-center text-[#2C2C2C]">添加支付方式</h3>
            </div>
            <div className="p-4 space-y-3">
              {addOptions.map(option => (
                <button
                  key={option.type}
                  onClick={() => {
                    setShowAddPanel(false)
                    // 实际应跳转对应授权流程
                    alert(`将跳转${option.name}授权页面`)
                  }}
                  className="w-full flex items-center gap-4 p-4 bg-[#FAF8F5] rounded-2xl hover:bg-[#F0EDE8] transition-colors"
                >
                  <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm">
                    {option.icon}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-[#2C2C2C]">{option.name}</p>
                    <p className="text-sm text-[#999999]">{option.desc}</p>
                  </div>
                  <ChevronLeft className="w-5 h-5 text-[#CCCCCC] rotate-180" />
                </button>
              ))}
            </div>
            <div className="p-4 pb-8">
              <button
                onClick={() => setShowAddPanel(false)}
                className="w-full py-3 text-[#666666] text-center"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 确认弹窗 */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowConfirm(null)}>
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-sm"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-center text-[#2C2C2C] mb-2">
              {showConfirm.action === "delete" ? "解除绑定" : "设为默认"}
            </h3>
            <p className="text-center text-[#666666] mb-6">
              {showConfirm.action === "delete"
                ? "解除绑定后，将无法使用该支付方式进行支付，确定解除吗？"
                : "设为默认后，支付时将优先使用该支付方式"}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(null)}
                className="flex-1 py-3 bg-[#FAF8F5] text-[#666666] rounded-full"
                disabled={processing}
              >
                取消
              </button>
              <button
                onClick={() => {
                  if (showConfirm.action === "delete") {
                    handleRemove(showConfirm.id)
                  } else {
                    handleSetDefault(showConfirm.id)
                  }
                }}
                className={`flex-1 py-3 rounded-full text-white ${
                  showConfirm.action === "delete" ? "bg-[#C41E3A]" : "bg-[#C41E3A]"
                }`}
                disabled={processing}
              >
                {processing ? "处理中..." : "确定"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 点击空白关闭菜单 */}
      {showMenu && (
        <div className="fixed inset-0 z-5" onClick={() => setShowMenu(null)} />
      )}
    </div>
  )
}
