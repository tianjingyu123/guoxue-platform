"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ChevronLeft, ChevronRight, User, Phone, MapPin, Check } from "lucide-react"
import { shopApi, type ShippingAddress } from "@/lib/api"

// 省市区数据（简化版）
const REGIONS: Record<string, Record<string, string[]>> = {
  "北京市": {
    "北京市": ["东城区", "西城区", "朝阳区", "丰台区", "石景山区", "海淀区", "顺义区", "通州区", "大兴区", "昌平区"]
  },
  "上海市": {
    "上海市": ["黄浦区", "徐汇区", "长宁区", "静安区", "普陀区", "虹口区", "杨浦区", "浦东新区", "宝山区", "闵行区"]
  },
  "广东省": {
    "广州市": ["天河区", "越秀区", "海珠区", "荔湾区", "白云区", "黄埔区", "番禺区", "花都区", "南沙区"],
    "深圳市": ["福田区", "罗湖区", "南山区", "宝安区", "龙华区", "龙岗区", "盐田区", "坪山区"],
    "佛山市": ["禅城区", "南海区", "顺德区", "三水区", "高明区"],
  },
  "江苏省": {
    "南京市": ["玄武区", "秦淮区", "建邺区", "鼓楼区", "浦口区", "栖霞区", "雨花台区", "江宁区", "六合区"],
    "苏州市": ["姑苏区", "吴中区", "相城区", "吴江区", "工业园区", "虎丘区"],
  },
  "浙江省": {
    "杭州市": ["上城区", "拱墅区", "西湖区", "滨江区", "萧山区", "余杭区", "富阳区", "临安区"],
    "宁波市": ["海曙区", "江北区", "镇海区", "北仑区", "鄞州区", "奉化区"],
  },
  "四川省": {
    "成都市": ["锦江区", "青羊区", "金牛区", "武侯区", "成华区", "龙泉驿区", "青白江区", "新都区", "温江区"],
  },
  "湖北省": {
    "武汉市": ["江岸区", "江汉区", "硚口区", "汉阳区", "武昌区", "青山区", "洪山区", "东西湖区"],
  },
  "陕西省": {
    "西安市": ["新城区", "碑林区", "莲湖区", "灞桥区", "未央区", "雁塔区", "阎良区", "临潼区", "长安区"],
  },
}

const PROVINCES = Object.keys(REGIONS)

function AddressEditContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const addressId = searchParams.get("id")
  const isEdit = !!addressId

  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [province, setProvince] = useState("")
  const [city, setCity] = useState("")
  const [district, setDistrict] = useState("")
  const [address, setAddress] = useState("")
  const [isDefault, setIsDefault] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  // 省市区选择弹窗
  const [showRegionPicker, setShowRegionPicker] = useState(false)
  const [pickerStep, setPickerStep] = useState<"province" | "city" | "district">("province")
  const [tempProvince, setTempProvince] = useState("")
  const [tempCity, setTempCity] = useState("")

  useEffect(() => {
    if (isEdit) {
      // Mock 加载已有地址
      setName("张三")
      setPhone("13812345678")
      setProvince("北京市")
      setCity("北京市")
      setDistrict("朝阳区")
      setAddress("建国路88号SOHO现代城A座1201室")
      setIsDefault(true)
    }
  }, [isEdit])

  const cities = province ? Object.keys(REGIONS[province] || {}) : []
  const districts = province && city ? (REGIONS[province]?.[city] || []) : []

  const regionText = province
    ? [province !== city ? province : "", city, district].filter(Boolean).join(" ")
    : ""

  function validate() {
    const e: Record<string, string> = {}
    if (!name.trim()) e.name = "请填写收货人姓名"
    else if (name.trim().length < 2) e.name = "姓名至少2个字"
    if (!phone.trim()) e.phone = "请填写手机号"
    else if (!/^1[3-9]\d{9}$/.test(phone.trim())) e.phone = "请输入有效的手机号"
    if (!province) e.region = "请选择省市区"
    if (!address.trim()) e.address = "请填写详细地址"
    else if (address.trim().length < 5) e.address = "详细地址至少5个字"
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSave() {
    if (!validate()) return
    setSaving(true)
    try {
      const data = { name: name.trim(), phone: phone.trim(), province, city, district, address: address.trim(), isDefault }
      if (isEdit && addressId) {
        await shopApi.updateAddress(addressId, data)
      } else {
        await shopApi.createAddress(data)
      }
      router.back()
    } catch {
      // 模拟成功
      router.back()
    } finally {
      setSaving(false)
    }
  }

  function handleProvinceSelect(p: string) {
    setTempProvince(p)
    setPickerStep("city")
  }

  function handleCitySelect(c: string) {
    setTempCity(c)
    setPickerStep("district")
  }

  function handleDistrictSelect(d: string) {
    setProvince(tempProvince)
    setCity(tempCity)
    setDistrict(d)
    setShowRegionPicker(false)
    setPickerStep("province")
    setErrors(prev => ({ ...prev, region: "" }))
  }

  function openRegionPicker() {
    setTempProvince(province || "")
    setTempCity(city || "")
    setPickerStep("province")
    setShowRegionPicker(true)
  }

  const pickerCities = tempProvince ? Object.keys(REGIONS[tempProvince] || {}) : []
  const pickerDistricts = tempProvince && tempCity ? (REGIONS[tempProvince]?.[tempCity] || []) : []

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      {/* 导航栏 */}
      <div className="sticky top-0 z-10 bg-white border-b border-[#E8E3DB] px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-1 -ml-1 text-[#2C2C2C]">
          <ChevronLeft size={22} />
        </button>
        <h1 className="flex-1 text-base font-semibold text-[#2C2C2C] font-serif">
          {isEdit ? "编辑地址" : "新增地址"}
        </h1>
      </div>

      {/* 表单 */}
      <div className="p-4 space-y-3">
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm" style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.06)" }}>
          {/* 收货人 */}
          <div className="px-4 py-3.5 border-b border-[#F5F0EA]">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 w-20 shrink-0">
                <User size={15} className="text-[#C41E3A]" />
                <span className="text-sm text-[#2C2C2C]">收货人</span>
              </div>
              <input
                type="text"
                value={name}
                onChange={e => { setName(e.target.value); setErrors(p => ({ ...p, name: "" })) }}
                placeholder="填写收货人姓名"
                className="flex-1 text-sm text-[#2C2C2C] placeholder-[#C0B8B0] outline-none bg-transparent"
              />
            </div>
            {errors.name && <p className="mt-1.5 ml-[88px] text-xs text-[#C41E3A]">{errors.name}</p>}
          </div>

          {/* 手机号 */}
          <div className="px-4 py-3.5 border-b border-[#F5F0EA]">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 w-20 shrink-0">
                <Phone size={15} className="text-[#C41E3A]" />
                <span className="text-sm text-[#2C2C2C]">手机号</span>
              </div>
              <input
                type="tel"
                value={phone}
                onChange={e => { setPhone(e.target.value); setErrors(p => ({ ...p, phone: "" })) }}
                placeholder="填写收货人手机号"
                maxLength={11}
                className="flex-1 text-sm text-[#2C2C2C] placeholder-[#C0B8B0] outline-none bg-transparent"
              />
            </div>
            {errors.phone && <p className="mt-1.5 ml-[88px] text-xs text-[#C41E3A]">{errors.phone}</p>}
          </div>

          {/* 省市区 */}
          <div className="px-4 py-3.5 border-b border-[#F5F0EA]">
            <button
              onClick={openRegionPicker}
              className="w-full flex items-center gap-3"
            >
              <div className="flex items-center gap-2 w-20 shrink-0">
                <MapPin size={15} className="text-[#C41E3A]" />
                <span className="text-sm text-[#2C2C2C]">所在地区</span>
              </div>
              <span className={`flex-1 text-left text-sm ${regionText ? "text-[#2C2C2C]" : "text-[#C0B8B0]"}`}>
                {regionText || "选择省 / 市 / 区"}
              </span>
              <ChevronRight size={16} className="text-[#C0B8B0]" />
            </button>
            {errors.region && <p className="mt-1.5 ml-[88px] text-xs text-[#C41E3A]">{errors.region}</p>}
          </div>

          {/* 详细地址 */}
          <div className="px-4 py-3.5">
            <div className="flex items-start gap-3">
              <div className="flex items-center gap-2 w-20 shrink-0 pt-0.5">
                <MapPin size={15} className="text-[#C41E3A]" />
                <span className="text-sm text-[#2C2C2C]">详细地址</span>
              </div>
              <textarea
                value={address}
                onChange={e => { setAddress(e.target.value); setErrors(p => ({ ...p, address: "" })) }}
                placeholder="街道、楼牌号等"
                rows={3}
                className="flex-1 text-sm text-[#2C2C2C] placeholder-[#C0B8B0] outline-none bg-transparent resize-none leading-relaxed"
              />
            </div>
            {errors.address && <p className="mt-1.5 ml-[88px] text-xs text-[#C41E3A]">{errors.address}</p>}
          </div>
        </div>

        {/* 设为默认 */}
        <div
          className="bg-white rounded-2xl px-4 py-3.5 flex items-center justify-between shadow-sm cursor-pointer"
          style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.06)" }}
          onClick={() => setIsDefault(v => !v)}
        >
          <span className="text-sm text-[#2C2C2C]">设为默认地址</span>
          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${isDefault ? "bg-[#C41E3A] border-[#C41E3A]" : "border-[#D0C8C0]"}`}>
            {isDefault && <Check size={12} className="text-white" strokeWidth={3} />}
          </div>
        </div>
      </div>

      {/* 保存按钮 */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-[#E8E3DB]">
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3.5 rounded-2xl bg-[#C41E3A] text-white text-base font-semibold disabled:opacity-60 transition-opacity"
        >
          {saving ? "保存中..." : "保存地址"}
        </button>
      </div>

      {/* 省市区选择弹窗 */}
      {showRegionPicker && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowRegionPicker(false)} />
          <div className="relative bg-white rounded-t-3xl overflow-hidden" style={{ maxHeight: "70vh" }}>
            {/* 头部 */}
            <div className="px-4 pt-4 pb-3 border-b border-[#E8E3DB] flex items-center justify-between">
              <button
                onClick={() => {
                  if (pickerStep === "district") setPickerStep("city")
                  else if (pickerStep === "city") setPickerStep("province")
                  else setShowRegionPicker(false)
                }}
                className="text-sm text-[#666666]"
              >
                {pickerStep === "province" ? "取消" : "返回"}
              </button>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-medium ${pickerStep === "province" ? "text-[#C41E3A]" : "text-[#999999]"}`}>省份</span>
                <span className="text-[#C0B8B0]">/</span>
                <span className={`text-sm font-medium ${pickerStep === "city" ? "text-[#C41E3A]" : "text-[#999999]"}`}>城市</span>
                <span className="text-[#C0B8B0]">/</span>
                <span className={`text-sm font-medium ${pickerStep === "district" ? "text-[#C41E3A]" : "text-[#999999]"}`}>区县</span>
              </div>
              <div className="w-8" />
            </div>

            {/* 选项列表 */}
            <div className="overflow-y-auto" style={{ maxHeight: "calc(70vh - 60px)" }}>
              {pickerStep === "province" && PROVINCES.map(p => (
                <button
                  key={p}
                  onClick={() => handleProvinceSelect(p)}
                  className={`w-full flex items-center justify-between px-5 py-3.5 border-b border-[#F5F0EA] text-sm ${tempProvince === p ? "text-[#C41E3A] font-medium bg-[#FEF5F6]" : "text-[#2C2C2C]"}`}
                >
                  <span>{p}</span>
                  {tempProvince === p && <Check size={16} className="text-[#C41E3A]" />}
                </button>
              ))}
              {pickerStep === "city" && pickerCities.map(c => (
                <button
                  key={c}
                  onClick={() => handleCitySelect(c)}
                  className={`w-full flex items-center justify-between px-5 py-3.5 border-b border-[#F5F0EA] text-sm ${tempCity === c ? "text-[#C41E3A] font-medium bg-[#FEF5F6]" : "text-[#2C2C2C]"}`}
                >
                  <span>{c}</span>
                  {tempCity === c && <Check size={16} className="text-[#C41E3A]" />}
                </button>
              ))}
              {pickerStep === "district" && pickerDistricts.map(d => (
                <button
                  key={d}
                  onClick={() => handleDistrictSelect(d)}
                  className={`w-full flex items-center justify-between px-5 py-3.5 border-b border-[#F5F0EA] text-sm ${district === d && province === tempProvince && city === tempCity ? "text-[#C41E3A] font-medium bg-[#FEF5F6]" : "text-[#2C2C2C]"}`}
                >
                  <span>{d}</span>
                  {district === d && province === tempProvince && city === tempCity && <Check size={16} className="text-[#C41E3A]" />}
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
      <div className="sticky top-0 z-10 bg-white border-b border-[#E8E3DB] px-4 py-3 flex items-center gap-3">
        <div className="w-6 h-6 bg-gray-200 rounded animate-pulse" />
        <div className="w-24 h-5 bg-gray-200 rounded animate-pulse" />
      </div>
      <div className="p-4">
        <div className="bg-white rounded-2xl p-4 animate-pulse space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-12 bg-gray-100 rounded" />
          ))}
        </div>
      </div>
    </div>
  )
}

export default function AddressEditPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AddressEditContent />
    </Suspense>
  )
}
