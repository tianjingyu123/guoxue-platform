"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ChevronLeft, ChevronRight, Check, Camera, X, MapPin, Package, RefreshCw } from "lucide-react"
import { shopApi, type OrderProduct, type ShippingAddress, type ProductSku } from "@/lib/api"

const exchangeReasons = [
  { value: "quality", label: "质量问题" },
  { value: "size", label: "尺寸不符" },
  { value: "wrong", label: "发错货" },
  { value: "dislike", label: "不喜欢/不想要" },
  { value: "other", label: "其他原因" },
]

const mockProducts: OrderProduct[] = [
  { id: "1", productId: "p1", name: "周易六十四卦详解（精装典藏版）", cover: "/placeholder.svg", skuId: "s1", skuName: "精装版", price: 168, quantity: 1, skus: [
    { id: "s1", name: "精装版", attrs: [{ name: "版本", value: "精装" }], price: 168, originalPrice: 298, stock: 50 },
    { id: "s2", name: "平装版", attrs: [{ name: "版本", value: "平装" }], price: 98, originalPrice: 158, stock: 100 },
  ] },
  { id: "2", productId: "p2", name: "紫微斗数入门教程", cover: "/placeholder.svg", skuId: "s3", skuName: "标准版", price: 88, quantity: 2, skus: [
    { id: "s3", name: "标准版", attrs: [{ name: "版本", value: "标准" }], price: 88, originalPrice: 128, stock: 80 },
  ] },
]

const mockAddresses: ShippingAddress[] = [
  { id: "1", name: "张三", phone: "138****8888", province: "北京市", city: "北京市", district: "朝阳区", address: "建国路88号SOHO现代城A座1201", isDefault: true },
]

function ExchangePageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const orderId = searchParams.get('orderId')

  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState<OrderProduct[]>([])
  const [addresses, setAddresses] = useState<ShippingAddress[]>([])
  const [selectedProduct, setSelectedProduct] = useState<OrderProduct | null>(null)
  const [reason, setReason] = useState("")
  const [exchangeType, setExchangeType] = useState<"same" | "different">("same")
  const [newSkuId, setNewSkuId] = useState("")
  const [description, setDescription] = useState("")
  const [images, setImages] = useState<string[]>([])
  const [selectedAddress, setSelectedAddress] = useState<ShippingAddress | null>(null)
  const [showReasonPicker, setShowReasonPicker] = useState(false)
  const [showSkuPicker, setShowSkuPicker] = useState(false)
  const [showAddressPicker, setShowAddressPicker] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    loadData()
  }, [orderId])

  const loadData = async () => {
    setLoading(true)
    try {
      const [productsRes, addressesRes] = await Promise.all([
        shopApi.getOrderProducts(orderId || "").catch(() => mockProducts),
        shopApi.listAddresses().catch(() => mockAddresses),
      ])
      setProducts(Array.isArray(productsRes) ? productsRes : mockProducts)
      setAddresses(Array.isArray(addressesRes) ? addressesRes : mockAddresses)
      const defaultAddr = (Array.isArray(addressesRes) ? addressesRes : mockAddresses).find(a => a.isDefault)
      if (defaultAddr) setSelectedAddress(defaultAddr)
    } catch {
      setProducts(mockProducts)
      setAddresses(mockAddresses)
      if (mockAddresses[0]) setSelectedAddress(mockAddresses[0])
    } finally {
      setLoading(false)
    }
  }

  const handleImageUpload = () => {
    if (images.length >= 5) return
    setImages([...images, `/placeholder.svg?t=${Date.now()}`])
  }

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index))
  }

  const validate = () => {
    const newErrors: Record<string, string> = {}
    if (!selectedProduct) newErrors.product = "请选择要换货的商品"
    if (!reason) newErrors.reason = "请选择换货原因"
    if (exchangeType === "different" && !newSkuId) newErrors.sku = "请选择新规格"
    if (!selectedAddress) newErrors.address = "请选择取件地址"
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validate() || !selectedProduct || !selectedAddress) return
    setSubmitting(true)
    try {
      const result = await shopApi.applyExchange(orderId || "", {
        productId: selectedProduct.id,
        reason,
        exchangeType,
        newSkuId: exchangeType === "different" ? newSkuId : undefined,
        description: description || undefined,
        images: images.length > 0 ? images : undefined,
        addressId: selectedAddress.id,
      })
      if (result.success) {
        router.push(`/shop/exchange/${result.exchangeId}`)
      }
    } catch {
      router.push("/shop/exchange/mock-id")
    } finally {
      setSubmitting(false)
    }
  }

  const availableSkus = selectedProduct?.skus?.filter(s => s.id !== selectedProduct.skuId) || []

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF8F5]">
        <div className="sticky top-0 z-10 bg-white border-b border-[#E8E3DB] px-4 py-3">
          <div className="w-24 h-5 bg-gray-200 rounded animate-pulse mx-auto" />
        </div>
        <div className="p-4 space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-2xl p-4 animate-pulse">
              <div className="h-20 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-[#E8E3DB] px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-1 -ml-1">
          <ChevronLeft className="w-6 h-6 text-[#2C2C2C]" />
        </button>
        <h1 className="flex-1 text-center font-semibold text-[#2C2C2C]">申请换货</h1>
        <div className="w-6" />
      </div>

      <div className="p-4 space-y-4">
        {/* Select Product */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Package className="w-5 h-5 text-[#C41E3A]" />
            <span className="font-medium text-[#2C2C2C]">选择换货商品</span>
            {errors.product && <span className="text-xs text-red-500 ml-auto">{errors.product}</span>}
          </div>
          <div className="space-y-3">
            {products.map(product => (
              <div
                key={product.id}
                onClick={() => {
                  setSelectedProduct(product)
                  setNewSkuId("")
                }}
                className={`flex gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                  selectedProduct?.id === product.id ? "border-[#C41E3A] bg-red-50" : "border-[#E8E3DB]"
                }`}
              >
                <div className="relative">
                  <img src={product.cover} alt={product.name} className="w-16 h-16 rounded-lg object-cover" />
                  {selectedProduct?.id === product.id && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-[#C41E3A] rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-[#2C2C2C] line-clamp-1">{product.name}</div>
                  <div className="text-xs text-[#999999] mt-1">{product.skuName}</div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[#C41E3A] font-semibold">¥{product.price}</span>
                    <span className="text-xs text-[#999999]">x{product.quantity}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Reason Select */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between" onClick={() => setShowReasonPicker(true)}>
            <div className="flex items-center gap-2">
              <span className="text-[#2C2C2C]">换货原因</span>
              {errors.reason && <span className="text-xs text-red-500">{errors.reason}</span>}
            </div>
            <div className="flex items-center gap-2">
              <span className={reason ? "text-[#2C2C2C]" : "text-[#999999]"}>
                {reason ? exchangeReasons.find(r => r.value === reason)?.label : "请选择"}
              </span>
              <ChevronRight className="w-5 h-5 text-[#CCCCCC]" />
            </div>
          </div>
        </div>

        {/* Exchange Type */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <RefreshCw className="w-5 h-5 text-[#C41E3A]" />
            <span className="font-medium text-[#2C2C2C]">换货类型</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: "same" as const, label: "同款换同款", desc: "更换相同规格商品" },
              { value: "different" as const, label: "换其他规格", desc: "更换其他规格" },
            ].map(type => (
              <div
                key={type.value}
                onClick={() => {
                  setExchangeType(type.value)
                  setNewSkuId("")
                }}
                className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                  exchangeType === type.value ? "border-[#C41E3A] bg-red-50" : "border-[#E8E3DB]"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    exchangeType === type.value ? "border-[#C41E3A]" : "border-[#CCCCCC]"
                  }`}>
                    {exchangeType === type.value && <div className="w-2 h-2 rounded-full bg-[#C41E3A]" />}
                  </div>
                  <span className="text-sm font-medium text-[#2C2C2C]">{type.label}</span>
                </div>
                <div className="text-xs text-[#999999] mt-1 ml-6">{type.desc}</div>
              </div>
            ))}
          </div>

          {/* New SKU Selection */}
          {exchangeType === "different" && selectedProduct && (
            <div className="mt-4 pt-4 border-t border-[#E8E3DB]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-[#666666]">选择新规格</span>
                {errors.sku && <span className="text-xs text-red-500">{errors.sku}</span>}
              </div>
              {availableSkus.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {availableSkus.map(sku => (
                    <button
                      key={sku.id}
                      onClick={() => setNewSkuId(sku.id)}
                      className={`px-3 py-2 rounded-lg text-sm border-2 transition-all ${
                        newSkuId === sku.id
                          ? "border-[#C41E3A] bg-red-50 text-[#C41E3A]"
                          : "border-[#E8E3DB] text-[#666666]"
                      }`}
                    >
                      {sku.name} ¥{sku.price}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-[#999999]">该商品暂无其他可换规格</div>
              )}
            </div>
          )}
        </div>

        {/* Description */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="font-medium text-[#2C2C2C] mb-3">问题描述（选填）</div>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="请详细描述换货原因，以便我们更好处理..."
            className="w-full h-24 p-3 bg-[#FAF8F5] rounded-xl text-sm text-[#2C2C2C] placeholder:text-[#999999] resize-none focus:outline-none focus:ring-2 focus:ring-[#C41E3A]/20"
            maxLength={200}
          />
          <div className="text-right text-xs text-[#999999] mt-1">{description.length}/200</div>
        </div>

        {/* Image Upload */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="font-medium text-[#2C2C2C] mb-3">上传凭证（选填，最多5张）</div>
          <div className="flex flex-wrap gap-3">
            {images.map((img, index) => (
              <div key={index} className="relative w-20 h-20">
                <img src={img} alt="" className="w-full h-full rounded-lg object-cover" />
                <button
                  onClick={() => removeImage(index)}
                  className="absolute -top-2 -right-2 w-5 h-5 bg-[#2C2C2C] rounded-full flex items-center justify-center"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            ))}
            {images.length < 5 && (
              <button
                onClick={handleImageUpload}
                className="w-20 h-20 bg-[#FAF8F5] rounded-lg border-2 border-dashed border-[#E8E3DB] flex flex-col items-center justify-center gap-1"
              >
                <Camera className="w-6 h-6 text-[#999999]" />
                <span className="text-xs text-[#999999]">{images.length}/5</span>
              </button>
            )}
          </div>
        </div>

        {/* Pickup Address */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="w-5 h-5 text-[#C41E3A]" />
            <span className="font-medium text-[#2C2C2C]">取件地址</span>
            {errors.address && <span className="text-xs text-red-500 ml-auto">{errors.address}</span>}
          </div>
          {selectedAddress ? (
            <div
              onClick={() => setShowAddressPicker(true)}
              className="flex items-center gap-3 p-3 bg-[#FAF8F5] rounded-xl cursor-pointer"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-[#2C2C2C]">{selectedAddress.name}</span>
                  <span className="text-[#666666]">{selectedAddress.phone}</span>
                </div>
                <div className="text-sm text-[#666666] mt-1">
                  {selectedAddress.province}{selectedAddress.city}{selectedAddress.district}{selectedAddress.address}
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-[#CCCCCC]" />
            </div>
          ) : (
            <button
              onClick={() => setShowAddressPicker(true)}
              className="w-full py-3 bg-[#FAF8F5] rounded-xl text-[#999999] text-sm"
            >
              请选择取件地址
            </button>
          )}
        </div>

        {/* Notice */}
        <div className="bg-blue-50 rounded-2xl p-4">
          <div className="text-sm font-medium text-blue-700 mb-2">换货须知</div>
          <ul className="text-xs text-blue-600 space-y-1">
            <li>• 审核通过后，快递员将上门取件</li>
            <li>• 请保持商品完好，配件齐全</li>
            <li>• 新商品将在收到退回商品后3个工作日内发出</li>
          </ul>
        </div>
      </div>

      {/* Submit Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E8E3DB] p-4 safe-area-inset-bottom">
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full py-3 bg-gradient-to-r from-[#C41E3A] to-[#E85D04] text-white font-medium rounded-xl disabled:opacity-50"
        >
          {submitting ? "提交中..." : "提交换货申请"}
        </button>
      </div>

      {/* Reason Picker Modal */}
      {showReasonPicker && (
        <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setShowReasonPicker(false)}>
          <div
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl animate-in slide-in-from-bottom duration-300"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-[#E8E3DB]">
              <span className="font-medium text-[#2C2C2C]">选择换货原因</span>
              <button onClick={() => setShowReasonPicker(false)} className="text-[#999999]">关闭</button>
            </div>
            <div className="p-4 pb-8 safe-area-inset-bottom">
              {exchangeReasons.map(r => (
                <button
                  key={r.value}
                  onClick={() => {
                    setReason(r.value)
                    setShowReasonPicker(false)
                  }}
                  className={`w-full py-3 text-left flex items-center justify-between ${
                    reason === r.value ? "text-[#C41E3A]" : "text-[#2C2C2C]"
                  }`}
                >
                  <span>{r.label}</span>
                  {reason === r.value && <Check className="w-5 h-5" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Address Picker Modal */}
      {showAddressPicker && (
        <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setShowAddressPicker(false)}>
          <div
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[70vh] overflow-y-auto animate-in slide-in-from-bottom duration-300"
            onClick={e => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white flex items-center justify-between p-4 border-b border-[#E8E3DB]">
              <span className="font-medium text-[#2C2C2C]">选择取件地址</span>
              <button onClick={() => setShowAddressPicker(false)} className="text-[#999999]">关闭</button>
            </div>
            <div className="p-4 pb-8 safe-area-inset-bottom space-y-3">
              {addresses.map(addr => (
                <div
                  key={addr.id}
                  onClick={() => {
                    setSelectedAddress(addr)
                    setShowAddressPicker(false)
                  }}
                  className={`p-3 rounded-xl border-2 cursor-pointer ${
                    selectedAddress?.id === addr.id ? "border-[#C41E3A] bg-red-50" : "border-[#E8E3DB]"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-[#2C2C2C]">{addr.name}</span>
                    <span className="text-[#666666]">{addr.phone}</span>
                    {addr.isDefault && (
                      <span className="text-xs px-1.5 py-0.5 bg-[#C41E3A] text-white rounded">默认</span>
                    )}
                  </div>
                  <div className="text-sm text-[#666666] mt-1">
                    {addr.province}{addr.city}{addr.district}{addr.address}
                  </div>
                </div>
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
      <div className="sticky top-0 z-10 bg-white border-b border-[#E8E3DB] px-4 py-3 h-14" />
      <div className="p-4 space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-2xl p-4 animate-pulse">
            <div className="h-20 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function ExchangePage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ExchangePageContent />
    </Suspense>
  )
}
