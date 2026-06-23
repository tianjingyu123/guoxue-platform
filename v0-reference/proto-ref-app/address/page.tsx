"use client"

import { useState } from "react"
import Link from "next/link"
import { Plus, MapPin, Phone, Edit2, Trash2, Check, ChevronRight, X } from "lucide-react"
import { BackButton } from "@/components/common/back-button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

// 地址数据
const initialAddresses = [
  {
    id: 1,
    name: "张三",
    phone: "138****8888",
    province: "北京市",
    city: "北京市",
    district: "朝阳区",
    street: "建国路88号",
    detail: "国贸中心A座1808室",
    isDefault: true,
  },
  {
    id: 2,
    name: "李四",
    phone: "139****9999",
    province: "上海市",
    city: "上海市",
    district: "浦东新区",
    street: "陆家嘴环路1000号",
    detail: "恒生银行大厦12层",
    isDefault: false,
  },
  {
    id: 3,
    name: "王五",
    phone: "137****7777",
    province: "广东省",
    city: "深圳市",
    district: "南山区",
    street: "科技园南路",
    detail: "腾讯大厦8楼",
    isDefault: false,
  },
]

// 省市区数据（简化示例）
const regions = {
  provinces: ["北京市", "上海市", "广东省", "浙江省", "江苏省", "四川省"],
  cities: {
    "北京市": ["北京市"],
    "上海市": ["上海市"],
    "广东省": ["广州市", "深圳市", "东莞市", "佛山市"],
    "浙江省": ["杭州市", "宁波市", "温州市"],
    "江苏省": ["南京市", "苏州市", "无锡市"],
    "四川省": ["成都市", "绵阳市", "德阳市"],
  } as Record<string, string[]>,
  districts: {
    "北京市": ["朝阳区", "海淀区", "东城区", "西城区", "丰台区"],
    "上海市": ["浦东新区", "黄浦区", "静安区", "徐汇区", "长宁区"],
    "广州市": ["天河区", "越秀区", "荔湾区", "白云区"],
    "深圳市": ["南山区", "福田区", "罗湖区", "宝安区"],
    "杭州市": ["西湖区", "上城区", "下城区", "江干区"],
    "成都市": ["锦江区", "青羊区", "金牛区", "武侯区"],
  } as Record<string, string[]>,
}

export default function AddressPage() {
  const [addresses, setAddresses] = useState(initialAddresses)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null)
  const [editingAddress, setEditingAddress] = useState<typeof initialAddresses[0] | null>(null)
  const [swipedId, setSwipedId] = useState<number | null>(null)
  
  // 表单状态
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    province: "",
    city: "",
    district: "",
    street: "",
    detail: "",
    isDefault: false,
  })
  const [showRegionPicker, setShowRegionPicker] = useState(false)
  const [regionStep, setRegionStep] = useState<"province" | "city" | "district">("province")
  
  // 设置默认地址
  const handleSetDefault = (id: number) => {
    setAddresses(prev => prev.map(addr => ({
      ...addr,
      isDefault: addr.id === id
    })))
  }
  
  // 删除地址
  const handleDelete = (id: number) => {
    setAddresses(prev => prev.filter(addr => addr.id !== id))
    setShowDeleteConfirm(null)
    setSwipedId(null)
  }
  
  // 打开编辑/新增弹窗
  const openEditModal = (address?: typeof initialAddresses[0]) => {
    if (address) {
      setEditingAddress(address)
      setFormData({
        name: address.name,
        phone: address.phone,
        province: address.province,
        city: address.city,
        district: address.district,
        street: address.street,
        detail: address.detail,
        isDefault: address.isDefault,
      })
    } else {
      setEditingAddress(null)
      setFormData({
        name: "",
        phone: "",
        province: "",
        city: "",
        district: "",
        street: "",
        detail: "",
        isDefault: addresses.length === 0,
      })
    }
    setShowEditModal(true)
  }
  
  // 保存地址
  const handleSave = () => {
    if (!formData.name || !formData.phone || !formData.province || !formData.detail) {
      return
    }
    
    if (editingAddress) {
      // 编辑
      setAddresses(prev => prev.map(addr => {
        if (addr.id === editingAddress.id) {
          return { ...addr, ...formData }
        }
        if (formData.isDefault) {
          return { ...addr, isDefault: false }
        }
        return addr
      }))
    } else {
      // 新增
      const newId = Math.max(...addresses.map(a => a.id), 0) + 1
      if (formData.isDefault) {
        setAddresses(prev => [
          { id: newId, ...formData },
          ...prev.map(a => ({ ...a, isDefault: false }))
        ])
      } else {
        setAddresses(prev => [...prev, { id: newId, ...formData }])
      }
    }
    
    setShowEditModal(false)
  }
  
  // 选择地区
  const handleSelectRegion = (value: string) => {
    if (regionStep === "province") {
      setFormData(prev => ({ ...prev, province: value, city: "", district: "" }))
      setRegionStep("city")
    } else if (regionStep === "city") {
      setFormData(prev => ({ ...prev, city: value, district: "" }))
      setRegionStep("district")
    } else {
      setFormData(prev => ({ ...prev, district: value }))
      setShowRegionPicker(false)
      setRegionStep("province")
    }
  }
  
  const getCurrentRegionOptions = () => {
    if (regionStep === "province") return regions.provinces
    if (regionStep === "city") return regions.cities[formData.province] || []
    return regions.districts[formData.city] || []
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border safe-area-pt">
  <div className="flex items-center justify-between px-4 h-14">
  <BackButton fallbackPath="/profile" />
  <h1 className="font-semibold text-base text-foreground">收货地址</h1>
          <div className="w-9" />
        </div>
      </header>

      {/* 地址列表 */}
      <div className="p-4 space-y-3">
        {addresses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-4">
              <MapPin className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-sm">暂无收货地址</p>
            <p className="text-muted-foreground/70 text-xs mt-1">添加地址后可快速下单</p>
          </div>
        ) : (
          addresses.map(address => (
            <div
              key={address.id}
              className="relative overflow-hidden"
              onTouchStart={() => setSwipedId(null)}
            >
              {/* 滑动删除按钮 */}
              <div 
                className={cn(
                  "absolute right-0 top-0 bottom-0 w-20 bg-destructive flex items-center justify-center transition-opacity",
                  swipedId === address.id ? "opacity-100" : "opacity-0 pointer-events-none"
                )}
                onClick={() => setShowDeleteConfirm(address.id)}
              >
                <Trash2 className="w-5 h-5 text-destructive-foreground" />
              </div>
              
              <Card 
                className={cn(
                  "p-4 transition-transform",
                  swipedId === address.id && "-translate-x-20"
                )}
                onClick={() => {
                  if (swipedId === address.id) {
                    setSwipedId(null)
                  } else {
                    setSwipedId(address.id)
                  }
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    {/* 收件人信息 */}
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-semibold text-foreground">{address.name}</span>
                      <span className="text-sm text-muted-foreground">{address.phone}</span>
                      {address.isDefault && (
                        <Badge className="text-[10px] px-1.5 py-0 bg-accent/20 text-accent border-0">
                          默认
                        </Badge>
                      )}
                    </div>
                    
                    {/* 地址详情 */}
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {address.province}{address.city !== address.province ? address.city : ""}{address.district}{address.street}{address.detail}
                    </p>
                  </div>
                  
                  {/* 编辑按钮 */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      openEditModal(address)
                    }}
                    className="p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
                
                {/* 设为默认 */}
                {!address.isDefault && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleSetDefault(address.id)
                    }}
                    className="mt-3 pt-3 border-t border-border w-full text-left text-xs text-primary hover:text-primary/80 transition-colors"
                  >
                    设为默认地址
                  </button>
                )}
              </Card>
            </div>
          ))
        )}
      </div>

      {/* 底部新增按钮 */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border safe-area-pb">
        <button
          onClick={() => openEditModal()}
          className="w-full py-3 bg-primary text-primary-foreground font-medium rounded-xl flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-5 h-5" />
          新增收货地址
        </button>
      </div>

      {/* 删除确认弹窗 */}
      {showDeleteConfirm !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <Card className="w-full max-w-sm p-6 text-center">
            <h3 className="font-semibold text-lg text-foreground mb-2">确认删除</h3>
            <p className="text-sm text-muted-foreground mb-6">删除后将无法恢复，确定要删除这个地址吗？</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 py-2.5 bg-secondary text-foreground font-medium rounded-xl hover:bg-secondary/80 transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => handleDelete(showDeleteConfirm)}
                className="flex-1 py-2.5 bg-destructive text-destructive-foreground font-medium rounded-xl hover:bg-destructive/90 transition-colors"
              >
                删除
              </button>
            </div>
          </Card>
        </div>
      )}

      {/* 新增/编辑地址弹窗 */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-background">
          {/* 顶部导航 */}
          <header className="sticky top-0 z-40 bg-background border-b border-border safe-area-pt">
            <div className="flex items-center justify-between px-4 h-14">
              <button
                onClick={() => setShowEditModal(false)}
                className="p-2 -ml-2 rounded-full hover:bg-secondary transition-colors"
              >
                <X className="w-5 h-5 text-foreground" />
              </button>
              <h1 className="font-semibold text-base text-foreground">
                {editingAddress ? "编辑地址" : "新增地址"}
              </h1>
              <button
                onClick={handleSave}
                disabled={!formData.name || !formData.phone || !formData.province || !formData.detail}
                className="text-sm text-primary font-medium disabled:text-muted-foreground"
              >
                保存
              </button>
            </div>
          </header>

          <div className="p-4 space-y-4">
            {/* 收件人 */}
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">收件人</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="请输入收件人���名"
                className="w-full px-4 py-3 bg-secondary rounded-xl text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            {/* 手机号 */}
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">手机号</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="请输入手机号码"
                className="w-full px-4 py-3 bg-secondary rounded-xl text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            {/* 省市区 */}
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">所在地区</label>
              <button
                onClick={() => {
                  setRegionStep("province")
                  setShowRegionPicker(true)
                }}
                className="w-full px-4 py-3 bg-secondary rounded-xl text-left flex items-center justify-between"
              >
                <span className={formData.province ? "text-foreground" : "text-muted-foreground/60"}>
                  {formData.province ? `${formData.province} ${formData.city} ${formData.district}` : "请选择省/市/区"}
                </span>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* 详细地址 */}
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">详细地址</label>
              <textarea
                value={formData.detail}
                onChange={(e) => setFormData(prev => ({ ...prev, detail: e.target.value }))}
                placeholder="街道、楼牌号等"
                rows={3}
                className="w-full px-4 py-3 bg-secondary rounded-xl text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              />
            </div>

            {/* 设为默认 */}
            <div className="flex items-center justify-between py-3">
              <span className="text-sm text-foreground">设为默认地址</span>
              <button
                onClick={() => setFormData(prev => ({ ...prev, isDefault: !prev.isDefault }))}
                className={cn(
                  "w-12 h-7 rounded-full transition-colors relative",
                  formData.isDefault ? "bg-primary" : "bg-secondary"
                )}
              >
                <div className={cn(
                  "absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform",
                  formData.isDefault ? "translate-x-6" : "translate-x-1"
                )} />
              </button>
            </div>
          </div>

          {/* 地区选择器 */}
          {showRegionPicker && (
            <div className="fixed inset-0 z-50 flex items-end bg-black/60">
              <div className="w-full bg-card rounded-t-2xl max-h-[60vh] flex flex-col">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <button
                    onClick={() => {
                      if (regionStep === "city") {
                        setRegionStep("province")
                      } else if (regionStep === "district") {
                        setRegionStep("city")
                      } else {
                        setShowRegionPicker(false)
                      }
                    }}
                    className="text-sm text-muted-foreground"
                  >
                    {regionStep === "province" ? "取消" : "返回"}
                  </button>
                  <h3 className="font-medium text-foreground">
                    {regionStep === "province" ? "选择省份" : regionStep === "city" ? "选择城市" : "选择区县"}
                  </h3>
                  <div className="w-10" />
                </div>
                <div className="flex-1 overflow-y-auto">
                  {getCurrentRegionOptions().map(option => (
                    <button
                      key={option}
                      onClick={() => handleSelectRegion(option)}
                      className="w-full px-4 py-3 text-left text-foreground hover:bg-secondary transition-colors flex items-center justify-between"
                    >
                      <span>{option}</span>
                      {((regionStep === "province" && formData.province === option) ||
                        (regionStep === "city" && formData.city === option) ||
                        (regionStep === "district" && formData.district === option)) && (
                        <Check className="w-4 h-4 text-primary" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
