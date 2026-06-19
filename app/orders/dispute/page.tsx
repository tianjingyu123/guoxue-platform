"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ChevronLeft, AlertTriangle, Package, Image as ImageIcon, X, Plus, MessageSquare, Camera, FileText, HelpCircle, Check, Clock, XCircle, ChevronRight } from "lucide-react"
import { disputeApi, type DisputeApplication, type DisputeDetail, type DisputeListItem } from "@/lib/api"

const disputeTypes = [
  { value: 'not_received', label: '未收到货', icon: Package, desc: '已付款但未收到商品' },
  { value: 'not_as_described', label: '商品不符', icon: FileText, desc: '收到的商品与描述不符' },
  { value: 'quality_issue', label: '质量问题', icon: AlertTriangle, desc: '商品存在质量缺陷' },
  { value: 'other', label: '其他问题', icon: HelpCircle, desc: '其他交易纠纷' },
] as const

const mockOrder = {
  orderId: 'order_001',
  orderNo: 'RB2024010100001',
  productName: '周易六十四卦详解（精装典藏版）',
  productCover: '/placeholder.svg',
  amount: 168,
  createdAt: '2024-01-01 12:00:00',
}

const mockMyDisputes: DisputeListItem[] = [
  { id: '1', orderId: 'o1', orderNo: 'RB2024010100002', type: 'quality_issue', status: 'processing', productName: '紫微斗数入门', productCover: '/placeholder.svg', createdAt: '2024-01-05 10:00:00' },
]

function DisputePageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const orderId = searchParams.get('orderId')
  const disputeId = searchParams.get('id')
  
  const [activeTab, setActiveTab] = useState<'apply' | 'list' | 'detail'>(disputeId ? 'detail' : orderId ? 'apply' : 'list')
  const [selectedType, setSelectedType] = useState<string>('')
  const [description, setDescription] = useState('')
  const [expectation, setExpectation] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [myDisputes, setMyDisputes] = useState<DisputeListItem[]>([])
  const [detail, setDetail] = useState<DisputeDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        if (disputeId) {
          const res = await disputeApi.detail(disputeId)
          setDetail(res)
          setActiveTab('detail')
        } else {
          const res = await disputeApi.myDisputes()
          setMyDisputes(res.data)
        }
      } catch {
        if (disputeId) {
          setDetail({
            id: disputeId,
            orderId: 'o1',
            orderNo: 'RB2024010100001',
            type: 'quality_issue',
            status: 'processing',
            description: '收到的书籍有破损，封面有明显折痕',
            images: ['/placeholder.svg'],
            expectation: '希望能够换货或退款',
            order: mockOrder,
            timeline: [
              { status: 'submitted', title: '提交申诉', description: '您已成功提交申诉', time: '2024-01-05 10:00', isCurrent: false },
              { status: 'processing', title: '处理中', description: '客服正在处理您的申诉', time: '2024-01-05 14:00', isCurrent: true },
            ],
            createdAt: '2024-01-05 10:00:00',
            canCancel: true,
          })
        } else {
          setMyDisputes(mockMyDisputes)
        }
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [disputeId])

  const handleImageUpload = () => {
    if (images.length >= 5) return
    setImages([...images, `/placeholder.svg?t=${Date.now()}`])
  }

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index))
  }

  const validate = () => {
    const newErrors: Record<string, string> = {}
    if (!selectedType) newErrors.type = '请选择纠纷类型'
    if (!description.trim()) newErrors.description = '请描述问题详情'
    if (description.length < 10) newErrors.description = '问题描述至少10个字'
    if (!expectation.trim()) newErrors.expectation = '请填写期望的解决方案'
    if (images.length === 0) newErrors.images = '请上传至少一张证据图片'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setSubmitting(true)
    try {
      const data: DisputeApplication = {
        orderId: orderId || mockOrder.orderId,
        type: selectedType as DisputeApplication['type'],
        description,
        images,
        expectation,
      }
      const res = await disputeApi.create(data)
      router.push(`/orders/dispute?id=${res.disputeId}`)
    } catch {
      router.push('/orders/dispute?id=new_dispute')
    } finally {
      setSubmitting(false)
    }
  }

  const getStatusInfo = (status: string) => {
    const map: Record<string, { label: string; color: string; icon: typeof Clock }> = {
      pending: { label: '待处理', color: 'text-orange-500 bg-orange-50', icon: Clock },
      processing: { label: '处理中', color: 'text-blue-500 bg-blue-50', icon: Clock },
      resolved: { label: '已解决', color: 'text-green-500 bg-green-50', icon: Check },
      rejected: { label: '已驳回', color: 'text-red-500 bg-red-50', icon: XCircle },
      cancelled: { label: '已取消', color: 'text-gray-500 bg-gray-100', icon: XCircle },
    }
    return map[status] || map.pending
  }

  const getTypeLabel = (type: string) => {
    return disputeTypes.find(t => t.value === type)?.label || type
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
            <div key={i} className="bg-white rounded-2xl p-4 animate-pulse">
              <div className="h-24 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // 详情视图
  if (activeTab === 'detail' && detail) {
    const statusInfo = getStatusInfo(detail.status)
    return (
      <div className="min-h-screen bg-[#FAF8F5] pb-24">
        <div className="sticky top-0 z-10 bg-white border-b border-[#E8E3DB] px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1 -ml-1">
            <ChevronLeft className="w-6 h-6 text-[#2C2C2C]" />
          </button>
          <h1 className="text-lg font-semibold text-[#2C2C2C] font-serif">申诉详情</h1>
        </div>

        {/* 状态卡片 */}
        <div className={`mx-4 mt-4 p-4 rounded-2xl ${detail.status === 'resolved' ? 'bg-gradient-to-r from-green-500 to-green-600' : detail.status === 'rejected' ? 'bg-gradient-to-r from-red-500 to-red-600' : 'bg-gradient-to-r from-blue-500 to-blue-600'}`}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
              <statusInfo.icon className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-white font-semibold text-lg">{statusInfo.label}</div>
              <div className="text-white/80 text-sm">{getTypeLabel(detail.type)}</div>
            </div>
          </div>
        </div>

        {/* 订单信息 */}
        <div className="mx-4 mt-4 bg-white rounded-2xl p-4">
          <div className="text-sm text-[#999999] mb-3">关联订单</div>
          <div className="flex gap-3">
            <img src={detail.order.productCover} alt="" className="w-16 h-16 rounded-lg object-cover bg-gray-100" />
            <div className="flex-1 min-w-0">
              <div className="text-[#2C2C2C] font-medium line-clamp-2">{detail.order.productName}</div>
              <div className="text-sm text-[#999999] mt-1">订单号：{detail.orderNo}</div>
              <div className="text-[#C41E3A] font-semibold mt-1">¥{detail.order.amount}</div>
            </div>
          </div>
        </div>

        {/* 申诉内容 */}
        <div className="mx-4 mt-4 bg-white rounded-2xl p-4">
          <div className="text-sm text-[#999999] mb-3">申诉内容</div>
          <div className="text-[#2C2C2C]">{detail.description}</div>
          {detail.images.length > 0 && (
            <div className="flex gap-2 mt-3 overflow-x-auto">
              {detail.images.map((img, i) => (
                <img key={i} src={img} alt="" className="w-20 h-20 rounded-lg object-cover bg-gray-100 flex-shrink-0" />
              ))}
            </div>
          )}
          <div className="mt-3 pt-3 border-t border-[#E8E3DB]">
            <div className="text-sm text-[#999999]">期望解决方案</div>
            <div className="text-[#2C2C2C] mt-1">{detail.expectation}</div>
          </div>
        </div>

        {/* 处理进度 */}
        <div className="mx-4 mt-4 bg-white rounded-2xl p-4">
          <div className="text-sm text-[#999999] mb-4">处理进度</div>
          <div className="space-y-4">
            {detail.timeline.map((item, index) => (
              <div key={index} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={`w-3 h-3 rounded-full ${item.isCurrent ? 'bg-[#C41E3A]' : 'bg-gray-300'}`} />
                  {index < detail.timeline.length - 1 && <div className="w-0.5 h-full bg-gray-200 mt-1" />}
                </div>
                <div className="flex-1 pb-4">
                  <div className={`font-medium ${item.isCurrent ? 'text-[#C41E3A]' : 'text-[#2C2C2C]'}`}>{item.title}</div>
                  {item.description && <div className="text-sm text-[#666666] mt-0.5">{item.description}</div>}
                  <div className="text-xs text-[#999999] mt-1">{item.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 底部操作 */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E8E3DB] p-4">
          <div className="flex gap-3">
            <button onClick={() => router.push(`/orders/${detail.orderId}`)} className="flex-1 py-3 rounded-full border border-[#E8E3DB] text-[#666666]">
              查看订单
            </button>
            {detail.canCancel && (
              <button className="flex-1 py-3 rounded-full bg-[#C41E3A] text-white">
                撤销申诉
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // 列表视图
  if (activeTab === 'list' && !orderId) {
    return (
      <div className="min-h-screen bg-[#FAF8F5]">
        <div className="sticky top-0 z-10 bg-white border-b border-[#E8E3DB] px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1 -ml-1">
            <ChevronLeft className="w-6 h-6 text-[#2C2C2C]" />
          </button>
          <h1 className="text-lg font-semibold text-[#2C2C2C] font-serif">我的申诉</h1>
        </div>

        {myDisputes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <MessageSquare className="w-10 h-10 text-gray-300" />
            </div>
            <div className="text-[#999999]">暂无申诉记录</div>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {myDisputes.map(item => {
              const statusInfo = getStatusInfo(item.status)
              return (
                <button
                  key={item.id}
                  onClick={() => router.push(`/orders/dispute?id=${item.id}`)}
                  className="w-full bg-white rounded-2xl p-4 text-left"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className={`px-2 py-0.5 rounded text-xs ${statusInfo.color}`}>{statusInfo.label}</span>
                    <span className="text-xs text-[#999999]">{item.createdAt.split(' ')[0]}</span>
                  </div>
                  <div className="flex gap-3">
                    <img src={item.productCover} alt="" className="w-14 h-14 rounded-lg object-cover bg-gray-100" />
                    <div className="flex-1 min-w-0">
                      <div className="text-[#2C2C2C] font-medium line-clamp-1">{item.productName}</div>
                      <div className="text-sm text-[#666666] mt-1">{getTypeLabel(item.type)}</div>
                      <div className="text-xs text-[#999999] mt-1">订单号：{item.orderNo}</div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-[#999999] flex-shrink-0 self-center" />
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // 申请视图
  return (
    <div className="min-h-screen bg-[#FAF8F5] pb-24">
      <div className="sticky top-0 z-10 bg-white border-b border-[#E8E3DB] px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-1 -ml-1">
          <ChevronLeft className="w-6 h-6 text-[#2C2C2C]" />
        </button>
        <h1 className="text-lg font-semibold text-[#2C2C2C] font-serif">提交申诉</h1>
      </div>

      {/* 订单信息 */}
      <div className="mx-4 mt-4 bg-white rounded-2xl p-4">
        <div className="text-sm text-[#999999] mb-3">申诉订单</div>
        <div className="flex gap-3">
          <img src={mockOrder.productCover} alt="" className="w-16 h-16 rounded-lg object-cover bg-gray-100" />
          <div className="flex-1 min-w-0">
            <div className="text-[#2C2C2C] font-medium line-clamp-2">{mockOrder.productName}</div>
            <div className="text-sm text-[#999999] mt-1">订单号：{mockOrder.orderNo}</div>
            <div className="text-[#C41E3A] font-semibold mt-1">¥{mockOrder.amount}</div>
          </div>
        </div>
      </div>

      {/* 纠纷类型 */}
      <div className="mx-4 mt-4 bg-white rounded-2xl p-4">
        <div className="text-sm text-[#999999] mb-3">
          纠纷类型 <span className="text-[#C41E3A]">*</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {disputeTypes.map(type => {
            const Icon = type.icon
            const isSelected = selectedType === type.value
            return (
              <button
                key={type.value}
                onClick={() => { setSelectedType(type.value); setErrors(e => ({ ...e, type: '' })) }}
                className={`p-3 rounded-xl border-2 text-left transition-all ${isSelected ? 'border-[#C41E3A] bg-red-50' : 'border-[#E8E3DB]'}`}
              >
                <Icon className={`w-5 h-5 mb-2 ${isSelected ? 'text-[#C41E3A]' : 'text-[#999999]'}`} />
                <div className={`font-medium ${isSelected ? 'text-[#C41E3A]' : 'text-[#2C2C2C]'}`}>{type.label}</div>
                <div className="text-xs text-[#999999] mt-0.5">{type.desc}</div>
              </button>
            )
          })}
        </div>
        {errors.type && <div className="text-sm text-[#C41E3A] mt-2">{errors.type}</div>}
      </div>

      {/* 问题描述 */}
      <div className="mx-4 mt-4 bg-white rounded-2xl p-4">
        <div className="text-sm text-[#999999] mb-3">
          问题描述 <span className="text-[#C41E3A]">*</span>
        </div>
        <textarea
          value={description}
          onChange={e => { setDescription(e.target.value); setErrors(er => ({ ...er, description: '' })) }}
          placeholder="请详细描述您遇到的问题，以便我们更好地帮助您解决..."
          className={`w-full h-32 p-3 rounded-xl border ${errors.description ? 'border-[#C41E3A]' : 'border-[#E8E3DB]'} bg-[#FAF8F5] resize-none text-[#2C2C2C] placeholder:text-[#999999]`}
        />
        <div className="flex justify-between mt-2">
          {errors.description && <span className="text-sm text-[#C41E3A]">{errors.description}</span>}
          <span className="text-xs text-[#999999] ml-auto">{description.length}/500</span>
        </div>
      </div>

      {/* 证据上传 */}
      <div className="mx-4 mt-4 bg-white rounded-2xl p-4">
        <div className="text-sm text-[#999999] mb-3">
          证据图片 <span className="text-[#C41E3A]">*</span>
          <span className="text-xs ml-2">（聊天记录、商品照片等）</span>
        </div>
        <div className="flex gap-2 flex-wrap">
          {images.map((img, index) => (
            <div key={index} className="relative w-20 h-20">
              <img src={img} alt="" className="w-full h-full rounded-lg object-cover bg-gray-100" />
              <button
                onClick={() => removeImage(index)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#C41E3A] text-white flex items-center justify-center"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          {images.length < 5 && (
            <button
              onClick={handleImageUpload}
              className={`w-20 h-20 rounded-lg border-2 border-dashed ${errors.images ? 'border-[#C41E3A]' : 'border-[#E8E3DB]'} flex flex-col items-center justify-center gap-1`}
            >
              <Camera className="w-5 h-5 text-[#999999]" />
              <span className="text-xs text-[#999999]">{images.length}/5</span>
            </button>
          )}
        </div>
        {errors.images && <div className="text-sm text-[#C41E3A] mt-2">{errors.images}</div>}
      </div>

      {/* 期望解决方案 */}
      <div className="mx-4 mt-4 bg-white rounded-2xl p-4">
        <div className="text-sm text-[#999999] mb-3">
          期望解决方案 <span className="text-[#C41E3A]">*</span>
        </div>
        <textarea
          value={expectation}
          onChange={e => { setExpectation(e.target.value); setErrors(er => ({ ...er, expectation: '' })) }}
          placeholder="请告诉我们您希望如何解决这个问题..."
          className={`w-full h-20 p-3 rounded-xl border ${errors.expectation ? 'border-[#C41E3A]' : 'border-[#E8E3DB]'} bg-[#FAF8F5] resize-none text-[#2C2C2C] placeholder:text-[#999999]`}
        />
        {errors.expectation && <div className="text-sm text-[#C41E3A] mt-2">{errors.expectation}</div>}
      </div>

      {/* 温馨提示 */}
      <div className="mx-4 mt-4 bg-orange-50 rounded-2xl p-4">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-orange-700">
            <div className="font-medium mb-1">温馨提示</div>
            <ul className="space-y-1 text-xs">
              <li>1. 请如实填写申诉信息，提供有效证据</li>
              <li>2. 我们将在1-3个工作日内处理您的申诉</li>
              <li>3. 处理结果将通过站内消息通知您</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 底部提交 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E8E3DB] p-4">
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full py-3.5 rounded-full bg-[#C41E3A] text-white font-medium disabled:opacity-50"
        >
          {submitting ? '提交中...' : '提交申诉'}
        </button>
      </div>
    </div>
  )
}

export default function DisputePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#FAF8F5]">
        <div className="sticky top-0 z-10 bg-white border-b border-[#E8E3DB] px-4 py-3 h-14" />
        <div className="p-4 space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-2xl p-4 animate-pulse">
              <div className="h-24 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      </div>
    }>
      <DisputePageContent />
    </Suspense>
  )
}
