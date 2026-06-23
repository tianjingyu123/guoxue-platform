"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Plus, MapPin, Phone, User, Check, Trash2 } from "lucide-react"
import { shopApi, type ShippingAddress } from "@/lib/api"

// Mock数据
const mockAddresses: ShippingAddress[] = [
  { id: "1", name: "张三", phone: "138****8888", province: "北京市", city: "北京市", district: "朝阳区", address: "建国路88号SOHO现代城A座1201室", isDefault: true },
  { id: "2", name: "李四", phone: "139****9999", province: "上海市", city: "上海市", district: "浦东新区", address: "张江高科技园区博云路2号浦软大厦8楼", isDefault: false },
  { id: "3", name: "王五", phone: "137****7777", province: "广东省", city: "深圳市", district: "南山区", address: "科技园南区高新南一道飞亚达大厦5层", isDefault: false },
]

export default function AddressListPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [addresses, setAddresses] = useState<ShippingAddress[]>([])
  const [swipedId, setSwipedId] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const touchStartX = useRef(0)
  const touchCurrentX = useRef(0)

  useEffect(() => {
    loadAddresses()
  }, [])

  const loadAddresses = async () => {
    setLoading(true)
    try {
      const data = await shopApi.listAddresses()
      setAddresses(data)
    } catch {
      setAddresses(mockAddresses)
    } finally {
      setLoading(false)
    }
  }

  const handleSetDefault = async (id: string) => {
    const prev = addresses
    setAddresses(addresses.map(a => ({ ...a, isDefault: a.id === id })))
    try {
      await shopApi.setDefaultAddress(id)
    } catch {
      setAddresses(prev)
    }
  }

  const handleDelete = async (id: string) => {
    const prev = addresses
    setAddresses(addresses.filter(a => a.id !== id))
    setDeleteConfirm(null)
    setSwipedId(null)
    try {
      await shopApi.deleteAddress(id)
    } catch {
      setAddresses(prev)
    }
  }

  const handleTouchStart = (e: React.TouchEvent, id: string) => {
    touchStartX.current = e.touches[0].clientX
    touchCurrentX.current = e.touches[0].clientX
  }

  const handleTouchMove = (e: React.TouchEvent, id: string) => {
    touchCurrentX.current = e.touches[0].clientX
    const diff = touchStartX.current - touchCurrentX.current
    if (diff > 50) {
      setSwipedId(id)
    } else if (diff < -30) {
      setSwipedId(null)
    }
  }

  const handleTouchEnd = () => {
    touchStartX.current = 0
    touchCurrentX.current = 0
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-10 bg-white border-b border-[#E8E3DB] px-4 py-3 flex items-center justify-between">
        <button onClick={() => router.back()} className="p-1 -ml-1">
          <ChevronLeft className="w-6 h-6 text-[#2C2C2C]" />
        </button>
        <h1 className="font-serif text-lg text-[#2C2C2C]">收货地址</h1>
        <button 
          onClick={() => router.push("/shop/addresses/edit")}
          className="p-1 -mr-1 text-[#C41E3A]"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      {/* 地址列表 */}
      <div className="p-4 space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 animate-pulse">
              <div className="flex gap-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/3" />
                  <div className="h-3 bg-gray-200 rounded w-full" />
                </div>
              </div>
            </div>
          ))
        ) : addresses.length === 0 ? (
          <div className="py-20 text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-[#FAF8F5] flex items-center justify-center">
              <MapPin className="w-10 h-10 text-[#999999]" />
            </div>
            <p className="text-[#999999] mb-4">暂无收货地址</p>
            <button
              onClick={() => router.push("/shop/addresses/edit")}
              className="px-6 py-2 bg-[#C41E3A] text-white rounded-full text-sm"
            >
              添加地址
            </button>
          </div>
        ) : (
          addresses.map(addr => (
            <div
              key={addr.id}
              className="relative overflow-hidden"
              onTouchStart={(e) => handleTouchStart(e, addr.id)}
              onTouchMove={(e) => handleTouchMove(e, addr.id)}
              onTouchEnd={handleTouchEnd}
            >
              {/* 删除按钮区域 */}
              <div
                className={`absolute right-0 top-0 bottom-0 w-20 bg-red-500 flex items-center justify-center transition-transform duration-200 ${
                  swipedId === addr.id ? "translate-x-0" : "translate-x-full"
                }`}
                style={{ borderRadius: "0 16px 16px 0" }}
              >
                <button
                  onClick={() => setDeleteConfirm(addr.id)}
                  className="p-3 text-white"
                >
                  <Trash2 className="w-6 h-6" />
                </button>
              </div>

              {/* 地址卡片 */}
              <div
                className={`bg-white rounded-2xl p-4 transition-transform duration-200 ${
                  swipedId === addr.id ? "-translate-x-20" : "translate-x-0"
                }`}
                onClick={() => router.push(`/shop/addresses/edit?id=${addr.id}`)}
              >
                <div className="flex gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    addr.isDefault ? "bg-[#C41E3A]/10" : "bg-[#FAF8F5]"
                  }`}>
                    <MapPin className={`w-5 h-5 ${addr.isDefault ? "text-[#C41E3A]" : "text-[#999999]"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-[#2C2C2C]">{addr.name}</span>
                      <span className="text-[#666666] text-sm">{addr.phone}</span>
                      {addr.isDefault && (
                        <span className="px-2 py-0.5 bg-[#C41E3A] text-white text-xs rounded">默认</span>
                      )}
                    </div>
                    <p className="text-sm text-[#666666] line-clamp-2">
                      {addr.province}{addr.city}{addr.district}{addr.address}
                    </p>
                  </div>
                </div>

                {/* 底部操作 */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#E8E3DB]">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (!addr.isDefault) handleSetDefault(addr.id)
                    }}
                    className={`flex items-center gap-1.5 text-sm ${
                      addr.isDefault ? "text-[#C41E3A]" : "text-[#666666]"
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      addr.isDefault ? "border-[#C41E3A] bg-[#C41E3A]" : "border-[#CCCCCC]"
                    }`}>
                      {addr.isDefault && <Check className="w-2.5 h-2.5 text-white" />}
                    </div>
                    设为默认
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      router.push(`/shop/addresses/edit?id=${addr.id}`)
                    }}
                    className="text-sm text-[#666666]"
                  >
                    编辑
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 底部新增按钮 */}
      {!loading && addresses.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-[#E8E3DB]">
          <button
            onClick={() => router.push("/shop/addresses/edit")}
            className="w-full py-3 bg-[#C41E3A] text-white rounded-full font-medium flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            新增收货地址
          </button>
        </div>
      )}

      {/* 删除确认弹窗 */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl p-6 mx-8 w-full max-w-sm">
            <h3 className="text-lg font-medium text-[#2C2C2C] text-center mb-2">删除地址</h3>
            <p className="text-[#666666] text-center mb-6">确定要删除这个收货地址吗？</p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setDeleteConfirm(null)
                  setSwipedId(null)
                }}
                className="flex-1 py-2.5 border border-[#E8E3DB] rounded-full text-[#666666]"
              >
                取消
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 py-2.5 bg-red-500 text-white rounded-full"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
