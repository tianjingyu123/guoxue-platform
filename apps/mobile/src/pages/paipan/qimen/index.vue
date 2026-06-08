<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">排盘工具</text>
      <text class="v0-route">V0: paipan/qimen</text>
    </view>
        <view class="min-h-screen bg-background flex flex-col">
          <!--   -->
          <view class="sticky top-0 z-10 bg-background border-b border-border">
            <view class="flex items-center justify-between px-4 h-12">
              <Link href="/paipan" class="p-1 -ml-1">
                <ChevronLeft class="w-6 h-6 text-foreground" />
              </Link>
              <text class="text-base font-bold text-foreground">热卜奇门遁甲</text>
              <view class="w-6" />
            </view>
          </view>
    
          <!--   -->
          <view class="bg-primary px-4 py-6 flex items-center justify-between">
            <text class="text-2xl font-bold text-white tracking-wide">奇门遁甲</text>
            <view class="v0-btn" class="flex items-center gap-1 text-white/90 hover:text-white transition-colors">
              <Share2 class="w-4 h-4" />
              <text class="text-sm">分享</text>
            </view>
          </view>
    
          <!--   -->
          <view class="flex-1 px-4 -mt-2">
            <view class="bg-card rounded-2xl shadow-sm ring-1 ring-border/60 overflow-hidden">
              <!--   -->
              <view class="px-4 py-4 border-b border-border/60">
                <view class="flex items-center justify-between">
                  <text class="text-sm font-medium text-foreground shrink-0">事项内容</text>
                  <input
                    type="text"
                    value={{ matter }}
                    @change={(e) => setMatter(e.target.value)}
                    placeholder="请输入事项(选填)"
                    class="text-right text-sm text-muted-foreground placeholder:text-muted-foreground/50 bg-transparent outline-none flex-1 ml-4"
                  />
                </view>
              </view>
    
              <!--   -->
              <view 
                class="px-4 py-4 border-b border-border/60 cursor-pointer hover:bg-secondary/20 transition-colors"
                @click={() => setShowDatePicker(true)}
              >
                <view class="flex items-center justify-between">
                  <view class="flex items-center gap-2">
                    <text class="text-sm font-medium text-foreground">排盘时间</text>
                    <view class="v0-btn" 
                      @click={(e) => { e.stopPropagation(); refreshTime(); }} 
                      class="p-1 text-muted-foreground hover:text-primary transition-colors"
                    >
                      <RefreshCw class="w-4 h-4" />
                    </view>
                  </view>
                  <view class="flex items-center gap-1">
                    <text class="text-sm text-foreground">{{ formatDateTime() }}</text>
                    <ChevronDown class="w-4 h-4 text-muted-foreground" />
                  </view>
                </view>
              </view>
    
              <!--   -->
              <view class="px-4 py-4 border-b border-border/60">
                <view class="flex items-center justify-between">
                  <text class="text-sm font-medium text-foreground shrink-0">排盘方式</text>
                  <view class="flex items-center gap-2">
                    <RadioOption 
                      :selected={panMethod === "zhuan"} 
                      @click={() => setPanMethod("zhuan")} 
                      label="转盘" 
                    />
                    <RadioOption 
                      :selected={panMethod === "fei"} 
                      @click={() => setPanMethod("fei")} 
                      label="飞盘" 
                    />
                  </view>
                </view>
              </view>
    
              <!--   -->
              <view class="px-4 py-4 border-b border-border/60">
                <view class="flex items-center justify-between">
                  <text class="text-sm font-medium text-foreground shrink-0">飞宫方式</text>
                  <view class="flex items-center gap-2">
                    <RadioOption 
                      :selected={flyMethod === "yangshun"} 
                      @click={() => setFlyMethod("yangshun")} 
                      label="阳顺阴逆" 
                    />
                    <RadioOption 
                      :selected={flyMethod === "yinyang"} 
                      @click={() => setFlyMethod("yinyang")} 
                      label="阴阳皆顺" 
                    />
                  </view>
                </view>
              </view>
    
              <!--   -->
              <view class="px-4 py-4 border-b border-border/60">
                <view class="flex flex-col gap-3">
                  <text class="text-sm font-medium text-foreground">起局方式</text>
                  <view class="flex flex-wrap gap-2">
                    <RadioOption 
                      :selected={startMethod === "chaibu"} 
                      @click={() => setStartMethod("chaibu")} 
                      label="拆补" 
                    />
                    <RadioOption 
                      :selected={startMethod === "maoshan"} 
                      @click={() => setStartMethod("maoshan")} 
                      label="茅山" 
                    />
                    <RadioOption 
                      :selected={startMethod === "zhirun"} 
                      @click={() => setStartMethod("zhirun")} 
                      label="置闰" 
                    />
                    <RadioOption 
                      :selected={startMethod === "custom"} 
                      @click={() => setStartMethod("custom")} 
                      label="自选局数" 
                    />
                  </view>
                </view>
              </view>
    
              <!--   -->
              {startMethod === "custom" && (
                <view class="px-4 py-3 border-b border-border/60 bg-secondary/20">
                  <view class="v0-btn" 
                    @click={() => setShowJuPicker(true)}
                    class="w-full flex items-center justify-between bg-card rounded-lg px-4 py-3 border border-border"
                  >
                    <text class="text-sm text-foreground">{{ customJu }}</text>
                    <ChevronDown class="w-4 h-4 text-muted-foreground" />
                  </view>
                </view>
              )}
    
              <!--   -->
              <view class="px-4 py-4 border-b border-border/60">
                <view class="flex items-center justify-between">
                  <text class="text-sm font-medium text-foreground shrink-0">暗干起法</text>
                  <view class="flex items-center gap-2">
                    <RadioOption 
                      :selected={anganMethod === "zhishi"} 
                      @click={() => setAnganMethod("zhishi")} 
                      label="值使门起" 
                    />
                    <RadioOption 
                      :selected={anganMethod === "dipan"} 
                      @click={() => setAnganMethod("dipan")} 
                      label="门地盘起" 
                    />
                  </view>
                </view>
              </view>
    
              <!--   -->
              <view class="px-4 py-4">
                <view class="flex items-center justify-between">
                  <text class="text-sm font-medium text-foreground shrink-0">时间类型</text>
                  <view class="flex items-center gap-2">
                    {useTrueSolar && (
                      <text class="text-xs text-muted-foreground">
                        北纬{{ coordinates.lat }}东经{{ coordinates.lng }}
                      </text>
                    )}
                    <CheckOption 
                      :checked={{ useTrueSolar }} 
                      @click={() => setUseTrueSolar(!useTrueSolar)} 
                      label="真太阳时" 
                    />
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
                href="/paipan/qimen/history"
                class="block w-full py-4 bg-card text-primary font-bold text-base rounded-xl text-center border border-primary/30 hover:bg-primary/5 transition-all"
              >
                排盘记录
              </Link>
            </view>
          </view>
    
          <!--   -->
          <DatePickerModal
            isOpen={{ showDatePicker }}
            onClose={() => setShowDatePicker(false)}
            onConfirm={(date) => {
              setDateTime({
                year: date.year,
                month: date.month,
                day: date.day,
                hour: date.hour ?? dateTime.hour,
                minute: date.minute ?? dateTime.minute
              })
            }}
            initialDate={{ dateTime }}
            initialMode="solar"
          />
    
          <!--   -->
          {showJuPicker && (
            <view class="fixed inset-0 bg-black/40 z-50 flex items-end" @click={() => setShowJuPicker(false)}>
              <view class="bg-card w-full rounded-t-2xl overflow-hidden animate-slide-up" @click={e => e.stopPropagation()}>
                <!--   -->
                <view class="flex items-center justify-between px-4 py-4 border-b border-border">
                  <view class="v0-btn" @click={() => setShowJuPicker(false)} class="text-primary text-sm font-medium">取消</view>
                  <text class="text-base font-semibold text-foreground">选择局数</text>
                  <view class="v0-btn" 
                    @click={() => setShowJuPicker(false)} 
                    class="text-primary text-sm font-medium"
                  >
                    确定
                  </view>
                </view>
                <!--   -->
                <view class="max-h-[50vh] overflow-y-auto">
                  
    <view v-for="(ju, index) in JU_OPTIONS" :key="index"> (
                    <view class="v0-btn"
                      key={{ ju }}
                      @click={() => {
                        setCustomJu(ju)
                        setShowJuPicker(false)
                      }}
                      class={`w-full py-4 text-center border-b border-border/60 last:border-b-0 transition-colors ${
                        customJu === ju 
                          ? "text-foreground font-semibold text-lg" 
                          : "text-muted-foreground"
                      }`}
                    >
                      {{ ju }}
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
const JU_OPTIONS = [

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