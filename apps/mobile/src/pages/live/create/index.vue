<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">直播</text>
      <text class="v0-route">V0: live/create</text>
    </view>
        <view class="min-h-screen bg-[#FAF8F5] pb-24">
          <!--   -->
          <view class="sticky top-0 z-10 bg-white border-b border-[#E8E3DB] px-4 py-3 flex items-center justify-between">
            <view class="v0-btn" @click={() => router.back()} class="p-1 -ml-1">
              <ChevronLeft class="w-6 h-6 text-[#2C2C2C]" />
            </view>
            <text class="text-lg font-semibold text-[#2C2C2C]">
              {editId ? "编辑直播" : "创建直播"}
            </text>
            <view class="v0-btn"
              @click={() => handleSubmit(true)}
              class="text-sm text-[#666666]"
            >
              存草稿
            </view>
          </view>
    
          <view class="p-4 space-y-4">
            <!--   -->
            <view class="bg-white rounded-2xl p-4">
              <text class="text-sm font-medium text-[#2C2C2C] mb-3 block">
                直播模式 <text class="text-[#C41E3A]">*</text>
              </text>
              <view class="grid grid-cols-2 gap-3">
                <view class="v0-btn"
                  @click={() => setLiveMode("vertical")}
                  class={cn(
                    "relative p-4 rounded-xl border-2 text-left transition-all",
                    liveMode === "vertical" 
                      ? "border-[#C41E3A] bg-red-50" 
                      : "border-[#E8E3DB] bg-[#FAF8F5] hover:border-[#C41E3A]/50"
                  )}
                >
                  <view class="absolute top-2 right-2 bg-[#C41E3A] text-white text-[10px] px-1.5 py-0.5 rounded">
                    推荐
                  </view>
                  <view class={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center mb-2",
                    liveMode === "vertical" ? "bg-[#C41E3A] text-white" : "bg-[#E8E3DB] text-[#666]"
                  )}>
                    <Smartphone class="w-5 h-5" />
                  </view>
                  <text class={cn("font-medium text-sm", liveMode === "vertical" ? "text-[#C41E3A]" : "text-[#2C2C2C]")}>
                    手机竖屏
                  </text>
                  <text class="text-[10px] text-[#999] mt-1">适合带货、聊天互动</text>
                </view>
                
                <view class="v0-btn"
                  @click={() => setLiveMode("horizontal")}
                  class={cn(
                    "p-4 rounded-xl border-2 text-left transition-all",
                    liveMode === "horizontal" 
                      ? "border-[#C41E3A] bg-red-50" 
                      : "border-[#E8E3DB] bg-[#FAF8F5] hover:border-[#C41E3A]/50"
                  )}
                >
                  <view class={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center mb-2",
                    liveMode === "horizontal" ? "bg-[#C41E3A] text-white" : "bg-[#E8E3DB] text-[#666]"
                  )}>
                    <Monitor class="w-5 h-5" />
                  </view>
                  <text class={cn("font-medium text-sm", liveMode === "horizontal" ? "text-[#C41E3A]" : "text-[#2C2C2C]")}>
                    OBS横屏
                  </text>
                  <text class="text-[10px] text-[#999] mt-1">适合课程、课件讲解</text>
                </view>
              </view>
              
              <!--   -->
              {liveMode === "horizontal" && (
                <view class="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <view class="flex items-start gap-2">
                    <Settings class="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <view>
                      <text class="text-xs text-amber-800 font-medium">OBS推流设置</text>
                      <text class="text-[10px] text-amber-700 mt-1">
                        横屏直播需要使用OBS等推流软件，开播后将显示推流地址。
                      </text>
                      <Link href="/live/obs-guide" class="text-[10px] text-amber-800 underline mt-1 inline-block">
                        查看OBS配置教程
                      </Link>
                    </view>
                  </view>
                </view>
              )}
            </view>
    
            <!--   -->
            <view class="bg-white rounded-2xl p-4">
              <text class="text-sm font-medium text-[#2C2C2C] mb-3 block">
                直播封面 <text class="text-[#C41E3A]">*</text>
              </text>
              <view
                @click={{ handleCoverUpload }}
                class={`relative aspect-video rounded-xl overflow-hidden border-2 border-dashed cursor-pointer transition-colors ${
                  errors.cover ? "border-[#C41E3A] bg-red-50" : "border-[#E8E3DB] bg-[#FAF8F5] hover:border-[#C41E3A]"
                }`}
              >
                {{ form.cover ? (
                  
                    <Image src={form.cover }} alt="封面" fill class="object-cover" />
                    <view class="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                      <Camera class="w-8 h-8 text-white" />
                    </view>
                  
                ) : (
                  <view class="absolute inset-0 flex flex-col items-center justify-center gap-2">
                    <Camera class="w-10 h-10 text-[#999999]" />
                    <text class="text-sm text-[#999999]">点击上传封面</text>
                    <text class="text-xs text-[#999999]">建议尺寸 16:9，支持 JPG/PNG</text>
                  </view>
                )}
              </view>
              {errors.cover && <text class="text-xs text-[#C41E3A] mt-2">{{ errors.cover }}</text>}
            </view>
    
            <!--   -->
            <view class="bg-white rounded-2xl p-4 space-y-4">
              <!--   -->
              <view>
                <text class="text-sm font-medium text-[#2C2C2C] mb-2 block">
                  直播标题 <text class="text-[#C41E3A]">*</text>
                </text>
                <input
                  type="text"
                  value={{ form.title }}
                  @change={e => {
                    setForm(prev => ({ ...prev, title: e.target.value }))
                    if (e.target.value.trim()) setErrors(prev => ({ ...prev, title: "" }))
                  }}
                  placeholder="请输入直播标题，最多30字"
                  maxLength={{ 30 }}
                  class={`w-full px-4 py-3 rounded-xl border bg-[#FAF8F5] text-[#2C2C2C] placeholder:text-[#999999] focus:outline-none focus:ring-2 ${
                    errors.title ? "border-[#C41E3A] focus:ring-[#C41E3A]/20" : "border-[#E8E3DB] focus:ring-[#C41E3A]/20 focus:border-[#C41E3A]"
                  }`}
                />
                <view class="flex justify-between mt-1">
                  {errors.title ? (
                    <text class="text-xs text-[#C41E3A]">{{ errors.title }}</text>
                  ) : (
                    <text />
                  )}
                  <text class="text-xs text-[#999999]">{{ form.title.length }}/30</text>
                </view>
              </view>
    
              <!--   -->
              <view>
                <text class="text-sm font-medium text-[#2C2C2C] mb-2 block">
                  开播时间 <text class="text-[#C41E3A]">*</text>
                </text>
                <view class="v0-btn"
                  @click={() => setShowDatePicker(true)}
                  class={`w-full px-4 py-3 rounded-xl border bg-[#FAF8F5] flex items-center justify-between ${
                    errors.startTime ? "border-[#C41E3A]" : "border-[#E8E3DB]"
                  }`}
                >
                  <view class="flex items-center gap-2">
                    <Calendar class="w-5 h-5 text-[#999999]" />
                    <text class={form.startTime ? "text-[#2C2C2C]" : "text-[#999999]"}>
                      {form.startTime ? formatDateTime(form.startTime) : "请选择开播时间"}
                    </text>
                  </view>
                  <ChevronRight class="w-5 h-5 text-[#999999]" />
                </view>
                {errors.startTime && <text class="text-xs text-[#C41E3A] mt-1">{{ errors.startTime }}</text>}
              </view>
    
              <!--   -->
              <view>
                <text class="text-sm font-medium text-[#2C2C2C] mb-2 block">直播类型</text>
                <view class="grid grid-cols-2 gap-3">
                  {[
                    { value: "knowledge", label: "知识授课", desc: "适合课程讲解" },
                    { value: "ecommerce", label: "电商带货", desc: "适合商品销售" },
                  ].map(item => (
                    <view class="v0-btn"
                      key={{ item.value }}
                      @click={() => setForm(prev => ({ ...prev, type: item.value as CreateLiveRoomData['type'] }))}
                      class={`p-4 rounded-xl border-2 text-left transition-all ${
                        form.type === item.value
                          ? "border-[#C41E3A] bg-red-50"
                          : "border-[#E8E3DB] bg-[#FAF8F5]"
                      }`}
                    >
                      <text class={`text-sm font-medium ${form.type === item.value ? "text-[#C41E3A]" : "text-[#2C2C2C]"}`}>
                        {{ item.label }}
                      </text>
                      <text class="text-xs text-[#999999] mt-1">{{ item.desc }}</text>
                    </view>
                  ))}
                </view>
              </view>
    
              <!--   -->
              <view>
                <text class="text-sm font-medium text-[#2C2C2C] mb-2 block">
                  直播分类 <text class="text-[#C41E3A]">*</text>
                </text>
                <view class="v0-btn"
                  @click={() => setShowCategoryPicker(true)}
                  class={`w-full px-4 py-3 rounded-xl border bg-[#FAF8F5] flex items-center justify-between ${
                    errors.categoryId ? "border-[#C41E3A]" : "border-[#E8E3DB]"
                  }`}
                >
                  <text class={selectedCategory ? "text-[#2C2C2C]" : "text-[#999999]"}>
                    {selectedCategory?.name || "请选择分类"}
                  </text>
                  <ChevronRight class="w-5 h-5 text-[#999999]" />
                </view>
                {errors.categoryId && <text class="text-xs text-[#C41E3A] mt-1">{{ errors.categoryId }}</text>}
              </view>
            </view>
    
            <!--   -->
            <view class="bg-white rounded-2xl p-4 space-y-4">
              <!--   -->
              <view>
                <text class="text-sm font-medium text-[#2C2C2C] mb-2 block">直播简介</text>
                <textarea
                  value={{ form.description }}
                  @change={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="介绍一下本场直播的内容..."
                  rows={{ 3 }}
                  maxLength={{ 200 }}
                  class="w-full px-4 py-3 rounded-xl border border-[#E8E3DB] bg-[#FAF8F5] text-[#2C2C2C] placeholder:text-[#999999] focus:outline-none focus:ring-2 focus:ring-[#C41E3A]/20 focus:border-[#C41E3A] resize-none"
                />
                <view class="text-right">
                  <text class="text-xs text-[#999999]">{{ form.description?.length || 0 }}/200</text>
                </view>
              </view>
    
              <!--   -->
              <view>
                <text class="text-sm font-medium text-[#2C2C2C] mb-2 block">
                  直播标签 <text class="text-xs text-[#999999] font-normal">（最多5个）</text>
                </text>
                <view class="flex flex-wrap gap-2 mb-2">
                  {form.tags?.map((tag, index) => (
                    <text
                      key={index}
                      class="inline-flex items-center gap-1 px-3 py-1.5 bg-red-50 text-[#C41E3A] rounded-full text-sm"
                    >
                      {{ tag }}
                      <view class="v0-btn" @click={() => removeTag(index)}>
                        <X class="w-3.5 h-3.5" />
                      </view>
                    </text>
                  ))}
                </view>
                {(form.tags?.length || 0) < 5 && (
                  <view class="flex gap-2">
                    <input
                      type="text"
                      value={{ tagInput }}
                      @change={e => setTagInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addTag()}
                      placeholder="输入标签后回车添加"
                      maxLength={{ 10 }}
                      class="flex-1 px-4 py-2 rounded-xl border border-[#E8E3DB] bg-[#FAF8F5] text-sm text-[#2C2C2C] placeholder:text-[#999999] focus:outline-none focus:ring-2 focus:ring-[#C41E3A]/20 focus:border-[#C41E3A]"
                    />
                    <view class="v0-btn"
                      @click={{ addTag }}
                      class="px-4 py-2 bg-[#C41E3A] text-white rounded-xl text-sm"
                    >
                      添加
                    </view>
                  </view>
                )}
              </view>
    
              <!--   -->
              <view class="flex items-center justify-between py-2">
                <view>
                  <text class="text-sm font-medium text-[#2C2C2C]">公开直播</text>
                  <text class="text-xs text-[#999999] mt-0.5">关闭后仅粉丝可见</text>
                </view>
                <view class="v0-btn"
                  @click={() => setForm(prev => ({ ...prev, isPublic: !prev.isPublic }))}
                  class={`w-12 h-7 rounded-full transition-colors ${
                    form.isPublic ? "bg-[#C41E3A]" : "bg-gray-300"
                  }`}
                >
                  <view
                    class={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      form.isPublic ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </view>
              </view>
            </view>
    
            <!--   -->
            <view class="flex items-start gap-2 px-2">
              <Info class="w-4 h-4 text-[#C9A96E] mt-0.5 flex-shrink-0" />
              <text class="text-xs text-[#999999]">
                直播开始前15分钟将推送通知给已预约的用户，请确保按时开播
              </text>
            </view>
          </view>
    
          <!--   -->
          <view class="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E8E3DB] p-4">
            <view class="v0-btn"
              @click={() => handleSubmit(false)}
              :disabled={{ loading }}
              class="w-full py-3.5 bg-gradient-to-r from-[#C41E3A] to-[#E85D75] text-white rounded-xl font-medium disabled:opacity-50"
            >
              {loading ? "提交中..." : editId ? "保存修改" : "��建直播"}
            </view>
          </view>
    
          <!--   -->
          {showCategoryPicker && (
            <view class="fixed inset-0 z-50 flex items-end">
              <view
                class="absolute inset-0 bg-black/50"
                @click={() => setShowCategoryPicker(false)}
              />
              <view class="relative w-full bg-white rounded-t-3xl max-h-[60vh] overflow-hidden">
                <view class="flex items-center justify-between p-4 border-b border-[#E8E3DB]">
                  <view class="v0-btn"
                    @click={() => setShowCategoryPicker(false)}
                    class="text-[#666666]"
                  >
                    取消
                  </view>
                  <text class="font-medium text-[#2C2C2C]">选择分类</text>
                  <text class="w-8" />
                </view>
                <view class="p-4 grid grid-cols-3 gap-3 overflow-y-auto max-h-[50vh]">
                  
    <view v-for="(cat, index) in categories" :key="index"> (
                    <view class="v0-btn"
                      key={{ cat.id }}
                      @click={() => {
                        setForm(prev => ({ ...prev, categoryId: cat.id }))
                        setShowCategoryPicker(false)
                        setErrors(prev => ({ ...prev, categoryId: "" }))
                      }}
                      class={`p-3 rounded-xl border-2 text-center transition-all ${
                        form.categoryId === cat.id
                          ? "border-[#C41E3A] bg-red-50 text-[#C41E3A]"
                          : "border-[#E8E3DB] bg-[#FAF8F5] text-[#2C2C2C]"
                      }`}
                    >
                      {{ cat.name }}
                    </view>
                  ))}
                </view>
              </view>
            </view>
          )}
    
          <!--   -->
          {showDatePicker && (
            <view class="fixed inset-0 z-50 flex items-end">
              <view
                class="absolute inset-0 bg-black/50"
                @click={() => setShowDatePicker(false)}
              />
              <view class="relative w-full bg-white rounded-t-3xl">
                <view class="flex items-center justify-between p-4 border-b border-[#E8E3DB]">
                  <view class="v0-btn"
                    @click={() => setShowDatePicker(false)}
                    class="text-[#666666]"
                  >
                    取消
                  </view>
                  <text class="font-medium text-[#2C2C2C]">选择时间</text>
                  <view class="v0-btn"
                    @click={{ confirmDateTime }}
                    class="text-[#C41E3A] font-medium"
                  >
                    确定
                  </view>
                </view>
                <view class="flex h-64">
                  <!--   -->
                  <view class="flex-1 overflow-y-auto border-r border-[#E8E3DB]">
                    {generateDateOptions().map(opt => (
                      <view class="v0-btn"
                        key={{ opt.date }}
                        @click={() => setSelectedDate(opt.date)}
                        class={`w-full px-4 py-3 text-left flex items-center justify-between ${
                          selectedDate === opt.date ? "bg-red-50 text-[#C41E3A]" : "text-[#2C2C2C]"
                        }`}
                      >
                        <text>{{ opt.display }}</text>
                        {selectedDate === opt.date && <Check class="w-5 h-5" />}
                      </view>
                    ))}
                  </view>
                  <!--   -->
                  <view class="flex-1 overflow-y-auto">
                    
    <view v-for="(time, index) in timeOptions" :key="index"> (
                      <view class="v0-btn"
                        key={{ time }}
                        @click={() => setSelectedTime(time)}
                        class={`w-full px-4 py-3 text-left flex items-center justify-between ${
                          selectedTime === time ? "bg-red-50 text-[#C41E3A]" : "text-[#2C2C2C]"
                        }`}
                      >
                        <text>{{ time }}</text>
                        {selectedTime === time && <Check class="w-5 h-5" />}
                      </view>
                    ))}
                  </view>
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
const mockCategories: LiveCategory[] = [
    const newErrors: Record<string, string> = {}
    const options: { date: string; display: string }[] = []
      const weekDay = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()]

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