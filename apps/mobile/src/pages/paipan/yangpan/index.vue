<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">排盘工具</text>
      <text class="v0-route">V0: paipan/yangpan</text>
    </view>
        <view class="min-h-screen bg-background flex flex-col">
          <!--   -->
          <view class="sticky top-0 z-20 bg-background border-b border-border">
            <view class="flex items-center justify-between px-4 h-12">
              <Link href="/paipan" class="p-1 -ml-1">
                <ChevronLeft class="w-6 h-6" />
              </Link>
              <text class="text-base font-bold">阳盘命理奇门</text>
              <view class="w-6" />
            </view>
          </view>
    
          <!--   -->
          <view class="bg-primary px-4 py-6 flex items-center justify-between">
            <text class="text-2xl font-bold text-white">阳盘命理奇门</text>
            <view class="v0-btn" class="flex items-center gap-1 text-white/90 hover:text-white">
              <Share2 class="w-4 h-4" />
              <text class="text-sm">分享</text>
            </view>
          </view>
    
          <!--   -->
          <view class="flex-1 px-3 py-4">
            <view class="bg-card rounded-xl border border-border overflow-hidden">
              <!--   -->
              <view class="px-4 py-4 border-b border-border/60">
                <view class="flex items-center justify-between">
                  <text class="text-sm font-medium text-foreground">客户名称</text>
                  <input
                    type="text"
                    value={{ customerName }}
                    @change={(e) => setCustomerName(e.target.value)}
                    placeholder="请输入客户名称(选填)"
                    class="text-sm text-right bg-transparent border-none outline-none placeholder:text-muted-foreground w-48"
                  />
                </view>
              </view>
    
              <!--   -->
              <view class="px-4 py-4 border-b border-border/60">
                <view class="flex items-center justify-between">
                  <text class="text-sm font-medium text-foreground">选择性别</text>
                  <view class="flex items-center gap-2">
                    <RadioOption :selected={gender === "male"} @click={() => setGender("male")} label="男" />
                    <RadioOption :selected={gender === "female"} @click={() => setGender("female")} label="女" />
                  </view>
                </view>
              </view>
    
              <!--   -->
              <view class="px-4 py-4 border-b border-border/60">
                <view class="v0-btn" 
                  class="flex items-center justify-between w-full"
                  @click={() => setShowDatePicker(true)}
                >
                  <text class="text-sm font-medium text-foreground">出生时间</text>
                  <view class="flex items-center gap-1">
                    <text class="text-sm text-muted-foreground">
                      {{ birthYear }}年{{ birthMonth }}月{{ birthDay }}日 {{ birthHour }}时{{ birthMinute }}分
                    </text>
                    <ChevronRight class="w-4 h-4 text-muted-foreground" />
                  </view>
                </view>
              </view>
    
              <!--   -->
              <view class="px-4 py-4 border-b border-border/60">
                <view class="flex items-center justify-between">
                  <text class="text-sm font-medium text-foreground">排盘方式</text>
                  <view class="flex items-center gap-2">
                    <RadioOption :selected={panMethod === "zhuan"} @click={() => setPanMethod("zhuan")} label="转盘" />
                    <RadioOption :selected={panMethod === "fei"} @click={() => setPanMethod("fei")} label="飞盘" />
                  </view>
                </view>
              </view>
    
              <!--   -->
              <view class="px-4 py-4 border-b border-border/60">
                <view class="flex items-center justify-between">
                  <text class="text-sm font-medium text-foreground">寄宫方式</text>
                  <view class="flex items-center gap-2">
                    <RadioOption :selected={jigongMethod === "kungong"} @click={() => setJigongMethod("kungong")} label="坤宫" />
                    <RadioOption :selected={jigongMethod === "yanggenyin"} @click={() => setJigongMethod("yanggenyin")} label="阳艮阴坤" />
                  </view>
                </view>
              </view>
    
              <!--   -->
              <view class="px-4 py-4 border-b border-border/60">
                <view class="flex flex-col gap-3">
                  <text class="text-sm font-medium text-foreground">起局方式</text>
                  <view class="flex flex-wrap gap-2">
                    <RadioOption :selected={startMethod === "chaibu"} @click={() => setStartMethod("chaibu")} label="拆补" />
                    <RadioOption :selected={startMethod === "maoshan"} @click={() => setStartMethod("maoshan")} label="茅山" />
                    <RadioOption :selected={startMethod === "zhirun"} @click={() => setStartMethod("zhirun")} label="置闰" />
                  </view>
                </view>
              </view>
    
              <!--   -->
              <view class="px-4 py-4 border-b border-border/60">
                <view class="flex items-center justify-between">
                  <text class="text-sm font-medium text-foreground">暗干起法</text>
                  <view class="flex items-center gap-2">
                    <RadioOption :selected={anganMethod === "zhishi"} @click={() => setAnganMethod("zhishi")} label="值使门起" />
                    <RadioOption :selected={anganMethod === "dipan"} @click={() => setAnganMethod("dipan")} label="门地盘起" />
                  </view>
                </view>
              </view>
    
              <!--   -->
              <view class="px-4 py-4 border-b border-border/60">
                <view class="v0-btn" 
                  class="flex items-center justify-between w-full"
                  @click={() => setShowPlacePicker(true)}
                >
                  <text class="text-sm font-medium text-foreground">出生地点</text>
                  <view class="flex items-center gap-1">
                    <text class="text-sm text-muted-foreground">
                      {birthPlace || "请选择出生地点"}
                    </text>
                    <ChevronRight class="w-4 h-4 text-muted-foreground" />
                  </view>
                </view>
              </view>
    
              <!--   -->
              <view class="px-4 py-4">
                <view class="flex items-center justify-between flex-wrap gap-3">
                  <view class="flex items-center gap-4">
                    <SwitchOption :checked={{ trueSolar }} @click={() => setTrueSolar(!trueSolar)} label="真太阳时" />
                    <SwitchOption :checked={{ earlyLateZi }} @click={() => setEarlyLateZi(!earlyLateZi)} label="早晚子时" />
                    <SwitchOption :checked={{ daylightSaving }} @click={() => setDaylightSaving(!daylightSaving)} label="夏令时" />
                  </view>
                  <view class="v0-btn" 
                    @click={() => setShowSizhuCheck(true)}
                    class="px-3 py-1.5 bg-primary/10 text-primary text-sm font-medium rounded-lg hover:bg-primary/20 transition-colors"
                  >
                    四柱反查
                  </view>
                </view>
              </view>
            </view>
    
            <!--   -->
            <view class="mt-6 space-y-3 pb-8">
              <view class="v0-btn"
                @click={{ handleSubmit }}
                class="w-full py-4 bg-gradient-to-r from-primary to-primary/90 text-white font-bold text-base rounded-xl shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 active:scale-[0.99] transition-all"
              >
                开始排盘
              </view>
              <Link
                href="/paipan/yangpan/history"
                class="block w-full py-4 bg-card text-primary font-bold text-base rounded-xl text-center border border-primary/30 hover:bg-primary/5 transition-all"
              >
                排盘记录
              </Link>
            </view>
          </view>
    
          <!--   -->
          {showSizhuCheck && (
            <view class="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
              <view class="bg-card w-full max-w-sm rounded-xl animate-scale-in">
                <view class="p-4 border-b border-border">
                  <text class="text-lg font-bold text-center">四柱反查</text>
                </view>
                <view class="p-4 space-y-4">
                  <text class="text-sm text-muted-foreground text-center">
                    通过已知的四柱八字反推出生时间
                  </text>
                  <view class="grid grid-cols-4 gap-2">
                    {["年柱", "月柱", "日柱", "时柱"].map((label) => (
                      <view key={{ label }} class="text-center">
                        <view class="text-xs text-muted-foreground mb-1">{{ label }}</view>
                        <input class="w-full h-10 rounded-lg border border-border text-center text-lg font-bold" placeholder="甲子" />
                      </view>
                    ))}
                  </view>
                </view>
                <view class="p-4 flex gap-2">
                  <view class="v0-btn" @click={() => setShowSizhuCheck(false)} class="flex-1 py-2.5 rounded-lg border border-border text-foreground hover:bg-secondary/50 transition-colors">取消</view>
                  <view class="v0-btn" @click={() => setShowSizhuCheck(false)} class="flex-1 py-2.5 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors">确定</view>
                </view>
              </view>
            </view>
          )}
    
          <!--   -->
          <DatePickerModal
            isOpen={{ showDatePicker }}
            onClose={() => setShowDatePicker(false)}
            onConfirm={(date) => {
              setBirthYear(date.year)
              setBirthMonth(date.month)
              setBirthDay(date.day)
              setBirthHour(date.hour)
              setBirthMinute(date.minute)
              setShowDatePicker(false)
            }}
            initialDate={{
              year: birthYear,
              month: birthMonth,
              day: birthDay,
              hour: birthHour,
              minute: birthMinute
            }}
            initialMode="solar"
          />
    
          <!--   -->
          <LocationPickerModal
            isOpen={{ showPlacePicker }}
            onClose={() => setShowPlacePicker(false)}
            onConfirm={(location) => {
              setBirthPlace(`${location.province} ${{ location.city }} ${{ location.district }}`)
              setShowPlacePicker(false)
            }}
          />
        </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'

const loading = ref(true)
const error = ref<string | null>(null)

// V0 原始数据


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