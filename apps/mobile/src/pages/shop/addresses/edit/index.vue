<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">edit</text>
      <text class="v0-route">V0: shop/addresses/edit</text>
    </view>
        <view class="min-h-screen bg-[#FAF8F5]">
          <!--   -->
          <view class="sticky top-0 z-10 bg-white border-b border-[#E8E3DB] px-4 py-3 flex items-center gap-3">
            <view class="v0-btn" @click={() => router.back()} class="p-1 -ml-1 text-[#2C2C2C]">
              <ChevronLeft size={{ 22 }} />
            </view>
            <text class="flex-1 text-base font-semibold text-[#2C2C2C] font-serif">
              {isEdit ? "编辑地址" : "新增地址"}
            </text>
          </view>
    
          <!--   -->
          <view class="p-4 space-y-3">
            <view class="bg-white rounded-2xl overflow-hidden shadow-sm" :style=" boxShadow: "0 2px 16px rgba(0,0,0,0.06)" }}>
              <!--   -->
              <view class="px-4 py-3.5 border-b border-[#F5F0EA]">
                <view class="flex items-center gap-3">
                  <view class="flex items-center gap-2 w-20 shrink-0">
                    <User size={{ 15 }} class="text-[#C41E3A]" />
                    <text class="text-sm text-[#2C2C2C]">收货人</text>
                  </view>
                  <input
                    type="text"
                    value={{ name }}
                    @change={e => { setName(e.target.value); setErrors(p => ({ ...p, name: "" })) }}
                    placeholder="填写收货人姓名"
                    class="flex-1 text-sm text-[#2C2C2C] placeholder-[#C0B8B0] outline-none bg-transparent"
                  />
                </view>
                {errors.name && <text class="mt-1.5 ml-[88px] text-xs text-[#C41E3A]">{{ errors.name }}</text>}
              </view>
    
              <!--   -->
              <view class="px-4 py-3.5 border-b border-[#F5F0EA]">
                <view class="flex items-center gap-3">
                  <view class="flex items-center gap-2 w-20 shrink-0">
                    <Phone size={{ 15 }} class="text-[#C41E3A]" />
                    <text class="text-sm text-[#2C2C2C]">手机号</text>
                  </view>
                  <input
                    type="tel"
                    value={{ phone }}
                    @change={e => { setPhone(e.target.value); setErrors(p => ({ ...p, phone: "" })) }}
                    placeholder="填写收货人手机号"
                    maxLength={{ 11 }}
                    class="flex-1 text-sm text-[#2C2C2C] placeholder-[#C0B8B0] outline-none bg-transparent"
                  />
                </view>
                {errors.phone && <text class="mt-1.5 ml-[88px] text-xs text-[#C41E3A]">{{ errors.phone }}</text>}
              </view>
    
              <!--   -->
              <view class="px-4 py-3.5 border-b border-[#F5F0EA]">
                <view class="v0-btn"
                  @click={{ openRegionPicker }}
                  class="w-full flex items-center gap-3"
                >
                  <view class="flex items-center gap-2 w-20 shrink-0">
                    <MapPin size={{ 15 }} class="text-[#C41E3A]" />
                    <text class="text-sm text-[#2C2C2C]">所在地区</text>
                  </view>
                  <text class={`flex-1 text-left text-sm ${regionText ? "text-[#2C2C2C]" : "text-[#C0B8B0]"}`}>
                    {regionText || "选择省 / 市 / 区"}
                  </text>
                  <ChevronRight size={{ 16 }} class="text-[#C0B8B0]" />
                </view>
                {errors.region && <text class="mt-1.5 ml-[88px] text-xs text-[#C41E3A]">{{ errors.region }}</text>}
              </view>
    
              <!--   -->
              <view class="px-4 py-3.5">
                <view class="flex items-start gap-3">
                  <view class="flex items-center gap-2 w-20 shrink-0 pt-0.5">
                    <MapPin size={{ 15 }} class="text-[#C41E3A]" />
                    <text class="text-sm text-[#2C2C2C]">详细地址</text>
                  </view>
                  <textarea
                    value={{ address }}
                    @change={e => { setAddress(e.target.value); setErrors(p => ({ ...p, address: "" })) }}
                    placeholder="街道、楼牌号等"
                    rows={{ 3 }}
                    class="flex-1 text-sm text-[#2C2C2C] placeholder-[#C0B8B0] outline-none bg-transparent resize-none leading-relaxed"
                  />
                </view>
                {errors.address && <text class="mt-1.5 ml-[88px] text-xs text-[#C41E3A]">{{ errors.address }}</text>}
              </view>
            </view>
    
            <!--   -->
            <view
              class="bg-white rounded-2xl px-4 py-3.5 flex items-center justify-between shadow-sm cursor-pointer"
              :style=" boxShadow: "0 2px 16px rgba(0,0,0,0.06)" }}
              @click={() => setIsDefault(v => !v)}
            >
              <text class="text-sm text-[#2C2C2C]">设为默认地址</text>
              <view class={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${isDefault ? "bg-[#C41E3A] border-[#C41E3A]" : "border-[#D0C8C0]"}`}>
                {{ isDefault && <Check size={12 }} class="text-white" strokeWidth={{ 3 }} />}
              </view>
            </view>
          </view>
    
          <!--   -->
          <view class="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-[#E8E3DB]">
            <view class="v0-btn"
              @click={{ handleSave }}
              :disabled={{ saving }}
              class="w-full py-3.5 rounded-2xl bg-[#C41E3A] text-white text-base font-semibold disabled:opacity-60 transition-opacity"
            >
              {saving ? "保存中..." : "保存地址"}
            </view>
          </view>
    
          <!--   -->
          {showRegionPicker && (
            <view class="fixed inset-0 z-50 flex flex-col justify-end">
              <view class="absolute inset-0 bg-black/40" @click={() => setShowRegionPicker(false)} />
              <view class="relative bg-white rounded-t-3xl overflow-hidden" :style=" maxHeight: "70vh" }}>
                <!--   -->
                <view class="px-4 pt-4 pb-3 border-b border-[#E8E3DB] flex items-center justify-between">
                  <view class="v0-btn"
                    @click={() => {
                      if (pickerStep === "district") setPickerStep("city")
                      else if (pickerStep === "city") setPickerStep("province")
                      else setShowRegionPicker(false)
                    }}
                    class="text-sm text-[#666666]"
                  >
                    {pickerStep === "province" ? "取消" : "返回"}
                  </view>
                  <view class="flex items-center gap-2">
                    <text class={`text-sm font-medium ${pickerStep === "province" ? "text-[#C41E3A]" : "text-[#999999]"}`}>省份</text>
                    <text class="text-[#C0B8B0]">/</text>
                    <text class={`text-sm font-medium ${pickerStep === "city" ? "text-[#C41E3A]" : "text-[#999999]"}`}>城市</text>
                    <text class="text-[#C0B8B0]">/</text>
                    <text class={`text-sm font-medium ${pickerStep === "district" ? "text-[#C41E3A]" : "text-[#999999]"}`}>区县</text>
                  </view>
                  <view class="w-8" />
                </view>
    
                <!--   -->
                <view class="overflow-y-auto" :style=" maxHeight: "calc(70vh - 60px)" }}>
                  {pickerStep === "province" && PROVINCES.map(p => (
                    <view class="v0-btn"
                      key={{ p }}
                      @click={() => handleProvinceSelect(p)}
                      class={`w-full flex items-center justify-between px-5 py-3.5 border-b border-[#F5F0EA] text-sm ${tempProvince === p ? "text-[#C41E3A] font-medium bg-[#FEF5F6]" : "text-[#2C2C2C]"}`}
                    >
                      <text>{{ p }}</text>
                      {{ tempProvince === p && <Check size={16 }} class="text-[#C41E3A]" />}
                    </view>
                  ))}
                  {pickerStep === "city" && pickerCities.map(c => (
                    <view class="v0-btn"
                      key={{ c }}
                      @click={() => handleCitySelect(c)}
                      class={`w-full flex items-center justify-between px-5 py-3.5 border-b border-[#F5F0EA] text-sm ${tempCity === c ? "text-[#C41E3A] font-medium bg-[#FEF5F6]" : "text-[#2C2C2C]"}`}
                    >
                      <text>{{ c }}</text>
                      {{ tempCity === c && <Check size={16 }} class="text-[#C41E3A]" />}
                    </view>
                  ))}
                  {pickerStep === "district" && pickerDistricts.map(d => (
                    <view class="v0-btn"
                      key={{ d }}
                      @click={() => handleDistrictSelect(d)}
                      class={`w-full flex items-center justify-between px-5 py-3.5 border-b border-[#F5F0EA] text-sm ${district === d && province === tempProvince && city === tempCity ? "text-[#C41E3A] font-medium bg-[#FEF5F6]" : "text-[#2C2C2C]"}`}
                    >
                      <text>{{ d }}</text>
                      {{ district === d && province === tempProvince && city === tempCity && <Check size={16 }} class="text-[#C41E3A]" />}
                    </view>
                  ))}
                </view>
              </view>
            </view>
          )}
        </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'

const loading = ref(true)
const error = ref<string | null>(null)

// V0 原始数据
const REGIONS: Record<string, Record<string, string[]>> = {
    const e: Record<string, string> = {}
      const data = { name: name.trim(), phone: phone.trim(), province, city, district, address: address.trim(), isDefault }

async function fetchData() {
  loading.value = true
  try { loading.value = false } catch (e: any) { error.value = e.message }
}

onMounted(() => fetchData())
onPullDownRefresh(() => fetchData().finally(() => uni.stopPullDownRefresh()))
</script>

<style scoped>
.page {
  background: #FAF8F5;
  min-height: 100vh;
}
.v0-header {
  padding: 24rpx 32rpx;
  background: linear-gradient(135deg, #C41E3A, #8B0000);
  margin-bottom: 24rpx;
}
.v0-title {
  font-size: 36rpx;
  font-weight: 700;
  color: #FFFFFF;
  display: block;
}
.v0-route {
  font-size: 20rpx;
  color: rgba(255,255,255,0.6);
  margin-top: 4rpx;
  display: block;
}
.v0-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 16rpx 32rpx;
  border-radius: 12rpx;
  background: #C41E3A;
  color: #FFFFFF;
  font-size: 28rpx;
}
.v0-hr {
  height: 1px;
  background: #E8E0D5;
  margin: 24rpx 0;
}
</style>