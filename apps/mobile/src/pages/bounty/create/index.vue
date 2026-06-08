<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">悬赏</text>
      <text class="v0-route">V0: bounty/create</text>
    </view>
        <view class="min-h-screen bg-[#FAF8F5]">
          <!--   -->
          <view class="sticky top-0 z-20 bg-white border-b border-[#E8E3DB]">
            <view class="flex items-center justify-between px-4 h-14">
              <view class="v0-btn" @click={() => router.back()} class="p-1 -ml-1">
                <ChevronLeft class="w-6 h-6 text-[#2C2C2C]" />
              </view>
              <text class="text-base font-semibold text-[#2C2C2C]" :style=" fontFamily: 'Noto Serif SC, serif' }}>
                发布悬赏
              </text>
              <view class="w-7" />
            </view>
          </view>
    
          <view class="px-4 py-4 space-y-4 pb-36">
            <!--   -->
            <view class="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3">
              <Flame class="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <view>
                <text class="text-sm font-medium text-amber-800">发布须知</text>
                <text class="text-xs text-amber-700 mt-1 leading-relaxed">
                  悬赏发布后将冻结对应金额，采纳满意答案后自动结算。若无满意回答，到期后原路退款。
                </text>
              </view>
            </view>
    
            <!--   -->
            <view class="bg-white rounded-2xl p-4 shadow-[0_2px_16px_rgba(0,0,0,0.06)]">
              <text class="block text-sm font-medium text-[#2C2C2C] mb-3">
                悬赏标题 <text class="text-[#C41E3A]">*</text>
              </text>
              <input
                class={`w-full text-sm bg-[#FAF8F5] rounded-xl px-3 py-3 outline-none border ${errors.title ? 'border-red-400' : 'border-transparent focus:border-[#C9A96E]'} transition-colors`}
                placeholder="请用一句话概括你的问题（10-50字）"
                value={{ title }}
                maxLength={{ 50 }}
                @change={e => {
                  setTitle(e.target.value)
                  if (errors.title) setErrors(prev => ({ ...prev, title: '' }))
                }}
              />
              <view class="flex justify-between items-center mt-2">
                {errors.title ? (
                  <text class="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle class="w-3 h-3" />{{ errors.title }}
                  </text>
                ) : <text />}
                <text class="text-xs text-[#999]">{{ title.length }}/50</text>
              </view>
            </view>
    
            <!--   -->
            <view class="bg-white rounded-2xl p-4 shadow-[0_2px_16px_rgba(0,0,0,0.06)]">
              <text class="block text-sm font-medium text-[#2C2C2C] mb-3">
                问题描述 <text class="text-[#C41E3A]">*</text>
              </text>
              <textarea
                class={`w-full text-sm bg-[#FAF8F5] rounded-xl px-3 py-3 outline-none border resize-none ${errors.description ? 'border-red-400' : 'border-transparent focus:border-[#C9A96E]'} transition-colors`}
                rows={{ 4 }}
                placeholder="详细描述你的问题，提供更多背景信息有助于获得更好的回答（20-500字）"
                value={{ description }}
                maxLength={{ 500 }}
                @change={e => {
                  setDescription(e.target.value)
                  if (errors.description) setErrors(prev => ({ ...prev, description: '' }))
                }}
              />
              <view class="flex justify-between items-center mt-2">
                {errors.description ? (
                  <text class="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle class="w-3 h-3" />{{ errors.description }}
                  </text>
                ) : <text />}
                <text class="text-xs text-[#999]">{{ description.length }}/500</text>
              </view>
            </view>
    
            <!--   -->
            <view class="bg-white rounded-2xl p-4 shadow-[0_2px_16px_rgba(0,0,0,0.06)]">
              <text class="block text-sm font-medium text-[#2C2C2C] mb-1">补充说明</text>
              <text class="text-xs text-[#999] mb-3">可提供出生日期、地点等具体信息（选填）</text>
              <textarea
                class="w-full text-sm bg-[#FAF8F5] rounded-xl px-3 py-3 outline-none border border-transparent focus:border-[#C9A96E] transition-colors resize-none"
                rows={{ 3 }}
                placeholder="补充具体信息..."
                value={{ content }}
                maxLength={{ 500 }}
                @change={e => setContent(e.target.value)}
              />
            </view>
    
            <!--   -->
            <view class="bg-white rounded-2xl p-4 shadow-[0_2px_16px_rgba(0,0,0,0.06)]">
              <text class="block text-sm font-medium text-[#2C2C2C] mb-3">
                悬赏金额 <text class="text-[#C41E3A]">*</text>
              </text>
              <view class="grid grid-cols-3 gap-2 mb-3">
                
    <view v-for="(amount, index) in AMOUNT_PRESETS" :key="index"> (
                  <view class="v0-btn"
                    key={{ amount }}
                    @click={() => { setSelectedAmount(amount); setIsCustom(false); setErrors(prev => ({ ...prev, amount: '' })) }}
                    class={`py-3 rounded-xl text-sm font-semibold border transition-all ${
                      !isCustom && selectedAmount === amount
                        ? 'bg-[#C41E3A] border-[#C41E3A] text-white'
                        : 'bg-[#FAF8F5] border-[#E8E3DB] text-[#2C2C2C] hover:border-[#C41E3A]'
                    }`}
                  >
                    ¥{{ amount }}
                  </view>
                ))}
              </view>
              <view class="v0-btn"
                @click={() => { setIsCustom(true); setErrors(prev => ({ ...prev, amount: '' })) }}
                class={`w-full py-3 rounded-xl text-sm border transition-all ${
                  isCustom
                    ? 'bg-[#C41E3A]/5 border-[#C41E3A] text-[#C41E3A]'
                    : 'bg-[#FAF8F5] border-[#E8E3DB] text-[#666]'
                }`}
              >
                自定义金额
              </view>
              {isCustom && (
                <view class={`mt-2 flex items-center bg-[#FAF8F5] rounded-xl px-3 py-3 border ${errors.amount ? 'border-red-400' : 'border-transparent focus-within:border-[#C9A96E]'} transition-colors`}>
                  <text class="text-[#999] text-sm mr-2">¥</text>
                  <input
                    type="number"
                    class="flex-1 text-sm outline-none bg-transparent"
                    placeholder="请输入金额（10-10000）"
                    value={{ customAmount }}
                    min={{ 10 }}
                    max={{ 10000 }}
                    @change={e => setCustomAmount(e.target.value)}
                  />
                </view>
              )}
              {errors.amount && (
                <text class="text-xs text-red-500 flex items-center gap-1 mt-1">
                  <AlertCircle class="w-3 h-3" />{{ errors.amount }}
                </text>
              )}
            </view>
    
            <!--   -->
            <view class="bg-white rounded-2xl p-4 shadow-[0_2px_16px_rgba(0,0,0,0.06)]">
              <text class="block text-sm font-medium text-[#2C2C2C] mb-3 flex items-center gap-2">
                <Clock class="w-4 h-4 text-[#C9A96E]" />
                有效期
              </text>
              <view class="grid grid-cols-4 gap-2">
                
    <view v-for="(opt, index) in EXPIRE_OPTIONS" :key="index"> (
                  <view class="v0-btn"
                    key={{ opt.value }}
                    @click={() => setExpireDays(opt.value)}
                    class={`py-3 rounded-xl text-center border transition-all ${
                      expireDays === opt.value
                        ? 'bg-[#C41E3A]/5 border-[#C41E3A] text-[#C41E3A]'
                        : 'bg-[#FAF8F5] border-[#E8E3DB] text-[#2C2C2C]'
                    }`}
                  >
                    <view class="text-sm font-semibold">{{ opt.label }}</view>
                    <view class="text-xs text-[#999] mt-0.5">{{ opt.desc }}</view>
                  </view>
                ))}
              </view>
            </view>
    
            <!--   -->
            <view class="bg-white rounded-2xl p-4 shadow-[0_2px_16px_rgba(0,0,0,0.06)]">
              <text class="block text-sm font-medium text-[#2C2C2C] mb-3 flex items-center gap-2">
                <Tag class="w-4 h-4 text-[#C9A96E]" />
                分类标签（选填）
              </text>
              <!--   -->
              <view class="flex flex-wrap gap-2 mb-3">
                
    <view v-for="(cat, index) in CATEGORY_OPTIONS" :key="index"> (
                  <view class="v0-btn"
                    key={{ cat }}
                    @click={() => setCategory(cat === category ? '' : cat)}
                    class={`px-3 py-1.5 rounded-full text-xs border transition-all ${
                      category === cat
                        ? 'bg-[#C41E3A] border-[#C41E3A] text-white'
                        : 'bg-[#FAF8F5] border-[#E8E3DB] text-[#666]'
                    }`}
                  >
                    {{ cat }}
                  </view>
                ))}
              </view>
              <!--   -->
              {tags.length > 0 && (
                <view class="flex flex-wrap gap-2 mb-2">
                  
    <view v-for="(tag, index) in tags" :key="index"> (
                    <text
                      key={tag}
                      @click={() => setTags(tags.filter(t => t !== tag))}
                      class="px-3 py-1.5 rounded-full text-xs bg-[#C9A96E]/10 text-[#C9A96E] border border-[#C9A96E]/30 cursor-pointer"
                    >
                      #{{ tag }} ×
                    </text>
                  ))}
                </view>
              )}
              <view class="flex gap-2">
                <input
                  class="flex-1 text-sm bg-[#FAF8F5] rounded-xl px-3 py-2.5 outline-none border border-transparent focus:border-[#C9A96E] transition-colors"
                  placeholder={`添加标签（最多5个，回车确认）`}
                  value={{ tagInput }}
                  @change={e => setTagInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddTag()}
                  :disabled={{ tags.length >= 5 }}
                />
                <view class="v0-btn"
                  @click={{ handleAddTag }}
                  :disabled={{ !tagInput.trim() || tags.length >= 5 }}
                  class="px-4 py-2.5 bg-[#FAF8F5] border border-[#E8E3DB] rounded-xl text-sm text-[#666] disabled:opacity-40"
                >
                  添加
                </view>
              </view>
            </view>
    
            <!--   -->
            <view class="bg-white rounded-2xl p-4 shadow-[0_2px_16px_rgba(0,0,0,0.06)]">
              <view class="flex items-center justify-between">
                <view class="flex items-center gap-3">
                  {isPublic ? (
                    <view class="w-9 h-9 bg-green-50 rounded-full flex items-center justify-center">
                      <Globe class="w-5 h-5 text-green-600" />
                    </view>
                  ) : (
                    <view class="w-9 h-9 bg-[#FAF8F5] rounded-full flex items-center justify-center">
                      <Lock class="w-5 h-5 text-[#999]" />
                    </view>
                  )}
                  <view>
                    <text class="text-sm font-medium text-[#2C2C2C]">{isPublic ? '公开悬赏' : '定向悬赏'}</text>
                    <text class="text-xs text-[#999]">
                      {isPublic ? '所有人均可查看并回答' : '仅特定答主可查看'}
                    </text>
                  </view>
                </view>
                <view class="v0-btn"
                  @click={() => setIsPublic(!isPublic)}
                  class={`w-11 h-6 rounded-full transition-colors relative ${isPublic ? 'bg-[#C41E3A]' : 'bg-[#E8E3DB]'}`}
                >
                  <text class={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isPublic ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </view>
              </view>
            </view>
          </view>
    
          <!--   -->
          <view class="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E8E3DB] px-4 pt-3 pb-safe-or-4">
            <!--   -->
            <view class="flex items-center justify-between mb-3 px-1">
              <text class="text-xs text-[#999]">
                悬赏金额将被冻结，采纳后结算
              </text>
              <view class="flex items-center gap-1">
                <Coins class="w-4 h-4 text-[#C9A96E]" />
                <text class="text-base font-bold text-[#C41E3A]">¥{{ finalAmount }}</text>
              </view>
            </view>
            <view class="v0-btn"
              @click={{ handleSubmit }}
              class="w-full py-3.5 bg-[#C41E3A] text-white rounded-2xl text-sm font-semibold"
            >
              发布悬赏
            </view>
          </view>
    
          <!--   -->
          {showPayConfirm && (
            <view class="fixed inset-0 z-50 flex items-end">
              <view class="absolute inset-0 bg-black/40" @click={() => setShowPayConfirm(false)} />
              <view class="relative w-full bg-white rounded-t-3xl px-6 pt-6 pb-safe-or-8 animate-in slide-in-from-bottom">
                <view class="w-10 h-1 bg-[#E8E3DB] rounded-full mx-auto mb-6" />
                <text class="text-center text-lg font-bold text-[#2C2C2C] mb-2" :style=" fontFamily: 'Noto Serif SC, serif' }}>
                  确认支付
                </text>
                <text class="text-center text-sm text-[#999] mb-6">
                  支付成功后将发布悬赏，悬赏金额将被冻结
                </text>
    
                <!--   -->
                <view class="bg-[#FAF8F5] rounded-2xl p-4 mb-5 space-y-3">
                  <view class="flex justify-between text-sm">
                    <text class="text-[#999]">悬赏标题</text>
                    <text class="text-[#2C2C2C] font-medium text-right max-w-[60%] line-clamp-1">{{ title }}</text>
                  </view>
                  <view class="flex justify-between text-sm">
                    <text class="text-[#999]">有效期</text>
                    <text class="text-[#2C2C2C]">{{ expireDays }}天</text>
                  </view>
                  <view class="flex justify-between text-sm">
                    <text class="text-[#999]">可见范围</text>
                    <text class="text-[#2C2C2C]">{isPublic ? '公开' : '定向'}</text>
                  </view>
                  <view class="border-t border-[#E8E3DB] pt-3 flex justify-between">
                    <text class="text-sm font-medium text-[#2C2C2C]">悬赏金额</text>
                    <text class="text-xl font-bold text-[#C41E3A]">¥{{ finalAmount }}</text>
                  </view>
                </view>
    
                <view class="v0-btn"
                  @click={{ handleConfirmPay }}
                  :disabled={{ loading }}
                  class="w-full py-4 bg-[#C41E3A] text-white rounded-2xl text-sm font-semibold disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <text class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    
                      <CheckCircle class="w-4 h-4" />
                      确认支付 ¥{{ finalAmount }}
                    
                  )}
                </view>
                <view class="v0-btn"
                  @click={() => setShowPayConfirm(false)}
                  class="w-full py-3 text-sm text-[#999] mt-2"
                >
                  取消
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
const AMOUNT_PRESETS = [10, 20, 50, 100, 200, 500]
const EXPIRE_OPTIONS = [
const CATEGORY_OPTIONS = [
    const newErrors: Record<string, string> = {}

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