"use client"

import { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ChevronLeft, ChevronDown, Camera, X, AlertCircle } from "lucide-react"
import { shopApi, uploadApi, type AfterSaleApplication } from "@/lib/api"

const reasons = [
  "商品质量问题",
  "商品与描述不符",
  "发错货/漏发货",
  "商品损坏",
  "不想要了/拍错了",
  "其他原因",
]

function AfterSaleContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const orderId = searchParams.get('orderId') || ''
  const maxAmount = parseFloat(searchParams.get('maxAmount') || '0')
  
  const [type, setType] = useState<'refund_only' | 'refund_with_return'>('refund_only')
  const [reason, setReason] = useState('')
  const [showReasonPicker, setShowReasonPicker] = useState(false)
  const [amount, setAmount] = useState(maxAmount.toString())
  const [description, setDescription] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    if (images.length + files.length > 5) {
      alert('最多上传5张图片')
      return
    }
    
    setUploading(true)
    try {
      const result = await uploadApi.images(Array.from(files))
      setImages([...images, ...result.urls])
    } catch {
      // Mock upload
      const mockUrls = Array.from(files).map((_, i) => `/placeholder.svg?t=${Date.now()}_${i}`)
      setImages([...images, ...mockUrls])
    }
    setUploading(false)
  }

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index))
  }

  const validate = () => {
    const newErrors: Record<string, string> = {}
    if (!reason) newErrors.reason = '请选择退款原因'
    if (!amount || parseFloat(amount) <= 0) newErrors.amount = '请输入退款金额'
    if (parseFloat(amount) > maxAmount) newErrors.amount = `退款金额不能超过${maxAmount}元`
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    
    setSubmitting(true)
    try {
      const data: AfterSaleApplication = {
        type,
        reason,
        amount: parseFloat(amount),
        description: description || undefined,
        images: images.length > 0 ? images : undefined,
      }
      await shopApi.applyAfterSale(orderId, data)
      router.push(`/shop/after-sale-progress?orderId=${orderId}`)
    } catch {
      // Mock success
      router.push(`/shop/after-sale-progress?orderId=${orderId}`)
    }
    setSubmitting(false)
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white border-b border-[#E8E3DB] px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-1 -ml-1">
          <ChevronLeft className="w-6 h-6 text-[#2C2C2C]" />
        </button>
        <h1 className="text-lg font-semibold text-[#2C2C2C] font-serif">申请售后</h1>
      </div>

      <div className="p-4 space-y-4 pb-28">
        {/* Type Selection */}
        <div className="bg-white rounded-2xl p-4">
          <h3 className="text-sm font-medium text-[#2C2C2C] mb-3">售后类型</h3>
          <div className="flex gap-3">
            <button
              onClick={() => setType('refund_only')}
              className={`flex-1 py-3 rounded-xl border-2 transition-all ${
                type === 'refund_only'
                  ? 'border-[#C41E3A] bg-red-50'
                  : 'border-[#E8E3DB] bg-white'
              }`}
            >
              <div className={`text-sm font-medium ${type === 'refund_only' ? 'text-[#C41E3A]' : 'text-[#2C2C2C]'}`}>
                仅退款
              </div>
              <div className="text-xs text-[#999999] mt-1">无需退货</div>
            </button>
            <button
              onClick={() => setType('refund_with_return')}
              className={`flex-1 py-3 rounded-xl border-2 transition-all ${
                type === 'refund_with_return'
                  ? 'border-[#C41E3A] bg-red-50'
                  : 'border-[#E8E3DB] bg-white'
              }`}
            >
              <div className={`text-sm font-medium ${type === 'refund_with_return' ? 'text-[#C41E3A]' : 'text-[#2C2C2C]'}`}>
                退货退款
              </div>
              <div className="text-xs text-[#999999] mt-1">需寄回商品</div>
            </button>
          </div>
        </div>

        {/* Reason */}
        <div className="bg-white rounded-2xl p-4">
          <h3 className="text-sm font-medium text-[#2C2C2C] mb-3">退款原因 <span className="text-[#C41E3A]">*</span></h3>
          <button
            onClick={() => setShowReasonPicker(true)}
            className={`w-full flex items-center justify-between py-3 px-4 rounded-xl border ${
              errors.reason ? 'border-red-400 bg-red-50' : 'border-[#E8E3DB]'
            }`}
          >
            <span className={reason ? 'text-[#2C2C2C]' : 'text-[#999999]'}>
              {reason || '请选择退款原因'}
            </span>
            <ChevronDown className="w-5 h-5 text-[#999999]" />
          </button>
          {errors.reason && (
            <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />{errors.reason}
            </p>
          )}
        </div>

        {/* Amount */}
        <div className="bg-white rounded-2xl p-4">
          <h3 className="text-sm font-medium text-[#2C2C2C] mb-3">
            退款金额 <span className="text-[#C41E3A]">*</span>
            <span className="text-xs text-[#999999] font-normal ml-2">最多可退 ¥{maxAmount.toFixed(2)}</span>
          </h3>
          <div className={`flex items-center gap-2 py-3 px-4 rounded-xl border ${
            errors.amount ? 'border-red-400 bg-red-50' : 'border-[#E8E3DB]'
          }`}>
            <span className="text-xl font-bold text-[#C41E3A]">¥</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="flex-1 text-xl font-bold text-[#2C2C2C] bg-transparent outline-none"
            />
            <button
              onClick={() => setAmount(maxAmount.toString())}
              className="text-xs text-[#C41E3A] bg-red-50 px-2 py-1 rounded"
            >
              全额退款
            </button>
          </div>
          {errors.amount && (
            <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />{errors.amount}
            </p>
          )}
        </div>

        {/* Description */}
        <div className="bg-white rounded-2xl p-4">
          <h3 className="text-sm font-medium text-[#2C2C2C] mb-3">问题描述</h3>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="请详细描述您遇到的问题，以便我们更好地处理..."
            rows={4}
            maxLength={500}
            className="w-full p-3 rounded-xl border border-[#E8E3DB] text-sm text-[#2C2C2C] placeholder:text-[#999999] resize-none outline-none focus:border-[#C41E3A]"
          />
          <div className="text-right text-xs text-[#999999] mt-1">{description.length}/500</div>
        </div>

        {/* Images */}
        <div className="bg-white rounded-2xl p-4">
          <h3 className="text-sm font-medium text-[#2C2C2C] mb-3">上传凭证 <span className="text-xs text-[#999999] font-normal">（最多5张）</span></h3>
          <div className="flex flex-wrap gap-3">
            {images.map((img, index) => (
              <div key={index} className="relative w-20 h-20">
                <img src={img} alt="" className="w-full h-full object-cover rounded-lg" />
                <button
                  onClick={() => removeImage(index)}
                  className="absolute -top-2 -right-2 w-5 h-5 bg-[#2C2C2C] rounded-full flex items-center justify-center"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            ))}
            {images.length < 5 && (
              <label className="w-20 h-20 border-2 border-dashed border-[#E8E3DB] rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-[#C41E3A] transition-colors">
                <Camera className="w-6 h-6 text-[#999999]" />
                <span className="text-xs text-[#999999] mt-1">{uploading ? '上传中' : '上传'}</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
            )}
          </div>
        </div>

        {/* Tips */}
        {type === 'refund_with_return' && (
          <div className="bg-amber-50 rounded-2xl p-4">
            <h4 className="text-sm font-medium text-amber-800 mb-2">退货说明</h4>
            <ul className="text-xs text-amber-700 space-y-1">
              <li>1. 请在收到退货地址后7天内寄回商品</li>
              <li>2. 请保持商品原状，附带所有包装和配件</li>
              <li>3. 建议使用有物流追踪的快递方式</li>
              <li>4. 退款将在收到商品后1-3个工作日内处理</li>
            </ul>
          </div>
        )}
      </div>

      {/* Bottom Submit */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E8E3DB] p-4 safe-area-pb">
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full py-3 bg-gradient-to-r from-[#C41E3A] to-[#E85A6B] text-white font-medium rounded-xl disabled:opacity-50"
        >
          {submitting ? '提交中...' : '提交申请'}
        </button>
      </div>

      {/* Reason Picker */}
      {showReasonPicker && (
        <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setShowReasonPicker(false)}>
          <div 
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[60vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-[#E8E3DB] flex items-center justify-between">
              <h3 className="font-medium text-[#2C2C2C]">选择退款原因</h3>
              <button onClick={() => setShowReasonPicker(false)} className="text-[#999999]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-2 max-h-[50vh] overflow-y-auto">
              {reasons.map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    setReason(r)
                    setShowReasonPicker(false)
                    setErrors({ ...errors, reason: '' })
                  }}
                  className={`w-full text-left py-3 px-4 rounded-xl transition-colors ${
                    reason === r
                      ? 'bg-red-50 text-[#C41E3A] border border-[#C41E3A]'
                      : 'bg-[#FAF8F5] text-[#2C2C2C]'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      <div className="sticky top-0 z-20 bg-white border-b border-[#E8E3DB] px-4 py-3 h-14" />
      <div className="p-4 space-y-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white rounded-2xl h-32 animate-pulse" />
        ))}
      </div>
    </div>
  )
}

export default function AfterSalePage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AfterSaleContent />
    </Suspense>
  )
}
