"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, FileText, Building2, User, Mail, Phone, Check, Download, Eye, AlertCircle } from "lucide-react"
import { invoiceApi, type InvoiceOrder, type Invoice } from "@/lib/api"

// Mock数据
const mockApplicableOrders: InvoiceOrder[] = [
  { orderId: "o1", orderNo: "202412150001", amount: 299, createdAt: "2024-12-15 10:30", productName: "周易六十四卦详解" },
  { orderId: "o2", orderNo: "202412140002", amount: 168, createdAt: "2024-12-14 15:20", productName: "紫微斗数入门课程" },
  { orderId: "o3", orderNo: "202412130003", amount: 88, createdAt: "2024-12-13 09:15", productName: "风水基础教程" },
]

const mockInvoices: Invoice[] = [
  { id: "i1", type: "company", title: "北京某某科技有限公司", taxNumber: "91110108MA01XXXXX", amount: 467, status: "completed", email: "finance@example.com", createdAt: "2024-12-10 14:30", completedAt: "2024-12-11 10:00" },
  { id: "i2", type: "personal", title: "张*三", amount: 168, status: "processing", email: "zhang***@163.com", createdAt: "2024-12-14 16:00" },
  { id: "i3", type: "company", title: "上海某某文化传媒", taxNumber: "91310115MA1HXXXX", amount: 299, status: "rejected", email: "acc@example.com", createdAt: "2024-12-08 11:20", rejectReason: "税号格式不正确" },
]

const invoiceReasons = ["质量问题", "尺寸不符", "发错货", "不喜欢/不想要"]

export default function InvoicePage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<"apply" | "list">("apply")
  const [loading, setLoading] = useState(true)
  const [applicableOrders, setApplicableOrders] = useState<InvoiceOrder[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  
  // 申请表单
  const [selectedOrders, setSelectedOrders] = useState<string[]>([])
  const [invoiceType, setInvoiceType] = useState<"personal" | "company">("personal")
  const [title, setTitle] = useState("")
  const [taxNumber, setTaxNumber] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [ordersRes, invoicesRes] = await Promise.all([
        invoiceApi.getApplicableOrders(),
        invoiceApi.myInvoices(),
      ])
      setApplicableOrders(ordersRes)
      setInvoices(invoicesRes.data)
    } catch {
      setApplicableOrders(mockApplicableOrders)
      setInvoices(mockInvoices)
    } finally {
      setLoading(false)
    }
  }

  const totalAmount = applicableOrders
    .filter(o => selectedOrders.includes(o.orderId))
    .reduce((sum, o) => sum + o.amount, 0)

  const validate = () => {
    const newErrors: Record<string, string> = {}
    if (selectedOrders.length === 0) newErrors.orders = "请选择要开票的订单"
    if (!title.trim()) newErrors.title = invoiceType === "company" ? "请输入公司名称" : "请输入个人姓名"
    if (invoiceType === "company" && !taxNumber.trim()) newErrors.taxNumber = "请输入税号"
    if (invoiceType === "company" && taxNumber && !/^[A-Z0-9]{15,20}$/.test(taxNumber)) {
      newErrors.taxNumber = "税号格式不正确"
    }
    if (!email.trim()) newErrors.email = "请输入接收邮箱"
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = "邮箱格式不正确"
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setSubmitting(true)
    try {
      await invoiceApi.apply({
        orderIds: selectedOrders,
        type: invoiceType,
        title,
        taxNumber: invoiceType === "company" ? taxNumber : undefined,
        amount: totalAmount,
        email,
        phone: phone || undefined,
      })
      // 清空表单
      setSelectedOrders([])
      setTitle("")
      setTaxNumber("")
      setEmail("")
      setPhone("")
      // 切换到已申请tab
      setActiveTab("list")
      loadData()
    } catch {
      // 模拟成功
      setActiveTab("list")
    } finally {
      setSubmitting(false)
    }
  }

  const toggleOrder = (orderId: string) => {
    setSelectedOrders(prev =>
      prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]
    )
    if (errors.orders) setErrors(prev => ({ ...prev, orders: "" }))
  }

  const getStatusConfig = (status: Invoice["status"]) => {
    switch (status) {
      case "pending": return { label: "待处理", color: "bg-yellow-100 text-yellow-700" }
      case "processing": return { label: "开票中", color: "bg-blue-100 text-blue-700" }
      case "completed": return { label: "已开具", color: "bg-green-100 text-green-700" }
      case "rejected": return { label: "已驳回", color: "bg-red-100 text-red-700" }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF8F5]">
        <div className="sticky top-0 z-10 bg-white border-b border-[#E8E3DB] px-4 py-3 flex items-center gap-3">
          <div className="w-6 h-6 bg-gray-200 rounded animate-pulse" />
          <div className="w-24 h-5 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="p-4 space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-2xl h-32 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] pb-32">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-10 bg-white border-b border-[#E8E3DB]">
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1 -ml-1">
            <ChevronLeft className="w-6 h-6 text-[#2C2C2C]" />
          </button>
          <h1 className="text-lg font-semibold text-[#2C2C2C]">发票管理</h1>
        </div>
        
        {/* Tab切换 */}
        <div className="flex border-b border-[#E8E3DB]">
          {[
            { key: "apply", label: "申请开票", count: applicableOrders.length },
            { key: "list", label: "已申请", count: invoices.length },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as "apply" | "list")}
              className={`flex-1 py-3 text-sm font-medium relative ${
                activeTab === tab.key ? "text-[#C41E3A]" : "text-[#666666]"
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`ml-1 px-1.5 py-0.5 text-xs rounded-full ${
                  activeTab === tab.key ? "bg-[#C41E3A] text-white" : "bg-gray-200 text-gray-600"
                }`}>
                  {tab.count}
                </span>
              )}
              {activeTab === tab.key && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-[#C41E3A] rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "apply" ? (
        <div className="p-4 space-y-4">
          {/* 可开票订单 */}
          <div className="bg-white rounded-2xl p-4">
            <h3 className="font-medium text-[#2C2C2C] mb-3 flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#C41E3A]" />
              选择订单
            </h3>
            {errors.orders && (
              <p className="text-xs text-red-500 mb-2">{errors.orders}</p>
            )}
            {applicableOrders.length === 0 ? (
              <p className="text-center py-6 text-[#999999]">暂无可开票订单</p>
            ) : (
              <div className="space-y-3">
                {applicableOrders.map(order => (
                  <label
                    key={order.orderId}
                    className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      selectedOrders.includes(order.orderId)
                        ? "border-[#C41E3A] bg-red-50"
                        : "border-[#E8E3DB] bg-[#FAF8F5]"
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      selectedOrders.includes(order.orderId)
                        ? "border-[#C41E3A] bg-[#C41E3A]"
                        : "border-gray-300"
                    }`}>
                      {selectedOrders.includes(order.orderId) && (
                        <Check className="w-3 h-3 text-white" />
                      )}
                    </div>
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={selectedOrders.includes(order.orderId)}
                      onChange={() => toggleOrder(order.orderId)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#2C2C2C] font-medium truncate">{order.productName}</p>
                      <p className="text-xs text-[#999999] mt-1">订单号：{order.orderNo}</p>
                      <p className="text-xs text-[#999999]">{order.createdAt}</p>
                    </div>
                    <p className="text-[#C41E3A] font-semibold">¥{order.amount}</p>
                  </label>
                ))}
              </div>
            )}
            {selectedOrders.length > 0 && (
              <div className="mt-4 pt-4 border-t border-[#E8E3DB] flex justify-between items-center">
                <span className="text-sm text-[#666666]">已选 {selectedOrders.length} 笔订单</span>
                <span className="text-lg font-bold text-[#C41E3A]">¥{totalAmount}</span>
              </div>
            )}
          </div>

          {/* 发票类型 */}
          <div className="bg-white rounded-2xl p-4">
            <h3 className="font-medium text-[#2C2C2C] mb-3">发票类型</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: "personal", label: "个人发票", icon: User, desc: "个人消费使用" },
                { key: "company", label: "企业发票", icon: Building2, desc: "公司报销使用" },
              ].map(type => (
                <button
                  key={type.key}
                  onClick={() => setInvoiceType(type.key as "personal" | "company")}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    invoiceType === type.key
                      ? "border-[#C41E3A] bg-red-50"
                      : "border-[#E8E3DB]"
                  }`}
                >
                  <type.icon className={`w-6 h-6 mb-2 ${
                    invoiceType === type.key ? "text-[#C41E3A]" : "text-[#666666]"
                  }`} />
                  <p className={`font-medium ${
                    invoiceType === type.key ? "text-[#C41E3A]" : "text-[#2C2C2C]"
                  }`}>{type.label}</p>
                  <p className="text-xs text-[#999999] mt-1">{type.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* 发票信息 */}
          <div className="bg-white rounded-2xl p-4">
            <h3 className="font-medium text-[#2C2C2C] mb-4">发票信息</h3>
            <div className="space-y-4">
              {/* 抬头 */}
              <div>
                <label className="block text-sm text-[#666666] mb-2">
                  {invoiceType === "company" ? "公司名称" : "个人姓名"} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={e => {
                    setTitle(e.target.value)
                    if (errors.title) setErrors(prev => ({ ...prev, title: "" }))
                  }}
                  placeholder={invoiceType === "company" ? "请输入公司全称" : "请输入真实姓名"}
                  className={`w-full px-4 py-3 rounded-xl border ${
                    errors.title ? "border-red-500" : "border-[#E8E3DB]"
                  } focus:outline-none focus:border-[#C41E3A]`}
                />
                {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
              </div>

              {/* 税号（企业） */}
              {invoiceType === "company" && (
                <div>
                  <label className="block text-sm text-[#666666] mb-2">
                    税号 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={taxNumber}
                    onChange={e => {
                      setTaxNumber(e.target.value.toUpperCase())
                      if (errors.taxNumber) setErrors(prev => ({ ...prev, taxNumber: "" }))
                    }}
                    placeholder="请输入纳税人识别号"
                    className={`w-full px-4 py-3 rounded-xl border ${
                      errors.taxNumber ? "border-red-500" : "border-[#E8E3DB]"
                    } focus:outline-none focus:border-[#C41E3A]`}
                  />
                  {errors.taxNumber && <p className="text-xs text-red-500 mt-1">{errors.taxNumber}</p>}
                </div>
              )}

              {/* 邮箱 */}
              <div>
                <label className="block text-sm text-[#666666] mb-2">
                  接收邮箱 <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#999999]" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => {
                      setEmail(e.target.value)
                      if (errors.email) setErrors(prev => ({ ...prev, email: "" }))
                    }}
                    placeholder="用于接收电子发票"
                    className={`w-full pl-12 pr-4 py-3 rounded-xl border ${
                      errors.email ? "border-red-500" : "border-[#E8E3DB]"
                    } focus:outline-none focus:border-[#C41E3A]`}
                  />
                </div>
                {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
              </div>

              {/* 手机号（可选） */}
              <div>
                <label className="block text-sm text-[#666666] mb-2">联系电话（选填）</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#999999]" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="方便开票问题联系"
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-[#E8E3DB] focus:outline-none focus:border-[#C41E3A]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 提示 */}
          <div className="bg-yellow-50 rounded-xl p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-700">
              <p className="font-medium mb-1">温馨提示</p>
              <ul className="text-xs space-y-1 text-yellow-600">
                <li>电子发票与纸质发票具有同等法律效力</li>
                <li>发票将在1-3个工作日内发送至您的邮箱</li>
                <li>如有问题请联系客服</li>
              </ul>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 space-y-3">
          {invoices.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-[#999999]">暂无发票记录</p>
              <button
                onClick={() => setActiveTab("apply")}
                className="mt-4 px-6 py-2 bg-[#C41E3A] text-white rounded-full text-sm"
              >
                去申请
              </button>
            </div>
          ) : (
            invoices.map(invoice => {
              const statusConfig = getStatusConfig(invoice.status)
              return (
                <div
                  key={invoice.id}
                  className="bg-white rounded-2xl p-4"
                  onClick={() => router.push(`/orders/invoice/${invoice.id}`)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {invoice.type === "company" ? (
                        <Building2 className="w-5 h-5 text-[#C41E3A]" />
                      ) : (
                        <User className="w-5 h-5 text-[#C41E3A]" />
                      )}
                      <span className="font-medium text-[#2C2C2C]">{invoice.title}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${statusConfig.color}`}>
                      {statusConfig.label}
                    </span>
                  </div>
                  
                  {invoice.taxNumber && (
                    <p className="text-xs text-[#999999] mb-2">税号：{invoice.taxNumber}</p>
                  )}
                  
                  <div className="flex items-center justify-between pt-3 border-t border-[#E8E3DB]">
                    <div>
                      <p className="text-lg font-bold text-[#C41E3A]">¥{invoice.amount}</p>
                      <p className="text-xs text-[#999999]">{invoice.createdAt}</p>
                    </div>
                    <div className="flex gap-2">
                      {invoice.status === "completed" && (
                        <button
                          onClick={e => {
                            e.stopPropagation()
                            invoiceApi.download(invoice.id)
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 bg-[#C41E3A] text-white rounded-full text-xs"
                        >
                          <Download className="w-3.5 h-3.5" />
                          下载
                        </button>
                      )}
                      <button className="flex items-center gap-1 px-3 py-1.5 border border-[#E8E3DB] rounded-full text-xs text-[#666666]">
                        <Eye className="w-3.5 h-3.5" />
                        详情
                      </button>
                    </div>
                  </div>
                  
                  {invoice.status === "rejected" && invoice.rejectReason && (
                    <div className="mt-3 p-2 bg-red-50 rounded-lg">
                      <p className="text-xs text-red-600">驳回原因：{invoice.rejectReason}</p>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}

      {/* 底部提交按钮 */}
      {activeTab === "apply" && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E8E3DB] p-4 safe-area-inset-bottom">
          <button
            onClick={handleSubmit}
            disabled={submitting || selectedOrders.length === 0}
            className="w-full py-3 bg-[#C41E3A] text-white rounded-full font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "提交中..." : `提交申请${totalAmount > 0 ? ` ¥${totalAmount}` : ""}`}
          </button>
        </div>
      )}
    </div>
  )
}
