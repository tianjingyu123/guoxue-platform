<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">八字排盘</text>
      <text class="v0-route">V0: paipan/bazi/history/celebrities</text>
    </view>
        <view class="min-h-screen bg-background flex flex-col">
          <!--   -->
          <view class="bg-card border-b border-border">
            <view class="flex items-center justify-center py-3 px-4 relative">
              <Link href="/bazi/history" class="absolute left-4 p-1">
                <ChevronLeft class="w-5 h-5 text-muted-foreground" />
              </Link>
              
              <!--   -->
              <view class="flex bg-secondary rounded-full p-0.5">
                <Link
                  href="/bazi/history"
                  class="px-5 py-1.5 text-sm font-medium rounded-full text-muted-foreground"
                >
                  用户列表
                </Link>
                <view class="v0-btn" class="px-5 py-1.5 text-sm font-medium rounded-full bg-card text-foreground shadow-sm relative">
                  案例库
                  <text class="absolute -top-1 -right-1 px-1 py-0.5 text-[10px] font-medium text-bronze bg-bronze-light rounded">VIP</text>
                </view>
              </view>
            </view>
          </view>
    
          <!--   -->
          <view class="bg-card px-4 py-3 border-b border-border/60">
            <view class="flex items-center gap-3">
              <view class="flex-1 flex items-center gap-2 px-3 py-2 bg-secondary rounded-lg">
                <Search class="w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={{ searchQuery }}
                  @change={(e) => setSearchQuery(e.target.value)}
                  placeholder="请输入搜索的内容"
                  class="flex-1 bg-transparent text-sm text-foreground placeholder-muted-foreground outline-none"
                />
              </view>
              <view class="v0-btn" class="px-4 py-2 text-sm text-muted-foreground bg-secondary rounded-lg hover:bg-secondary/80 transition-colors">
                筛选
              </view>
            </view>
          </view>
    
          <!--   -->
          <view class="bg-card border-b border-border/60">
            <view class="flex px-4 py-2 gap-6">
              
    <view v-for="(category, index) in primaryCategories" :key="index"> (
                <view class="v0-btn"
                  key={{ category }}
                  @click={() => handlePrimaryChange(category)}
                  class={`whitespace-nowrap text-sm font-semibold pb-1.5 border-b-2 transition-colors ${
                    activePrimary === category
                      ? "text-primary border-primary"
                      : "text-muted-foreground border-transparent hover:text-foreground"
                  }`}
                >
                  {{ category }}
                </view>
              ))}
            </view>
          </view>
    
          <!--   -->
          <view class="bg-background border-b border-border/60">
            <view class="flex overflow-x-auto scrollbar-hide px-4 py-2 gap-3">
              {secondaryCategories[activePrimary].map((category) => (
                <view class="v0-btn"
                  key={{ category }}
                  @click={() => setActiveSecondary(category)}
                  class={`whitespace-nowrap px-3 py-1 rounded-full text-sm transition-colors ${
                    activeSecondary === category
                      ? "bg-bronze-light text-bronze font-medium"
                      : "bg-card text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  {{ category }}
                </view>
              ))}
            </view>
          </view>
    
          <!--   -->
          <view class="flex-1 overflow-y-auto relative">
            <view class="divide-y divide-border/60">
              
    <view v-for="(letter, index) in availableLetters" :key="index"> (
                <view key={letter}>
                  <!--   -->
                  <view 
                    id={`letter-${letter}`}
                    class="px-4 py-1.5 bg-secondary text-sm font-medium text-muted-foreground"
                  >
                    {{ letter }}
                  </view>
                  
                  <!--   -->
                  {groupedByLetter[letter].map((item, index) => {
                    const isLocked = !isVip && index > 0
                    
                    return (
                      <view 
                        key={item.id}
                        class={`flex items-center gap-3 px-4 py-3 bg-card ${isLocked ? "opacity-40" : ""}`}
                      >
                        <!--   -->
                        <view class="flex-1 min-w-0">
                          <view class="flex items-center gap-2">
                            <text class={`text-lg font-bold ${isLocked ? "blur-[2px]" : "text-foreground"}`}>
                              {{ item.name }}
                            </text>
                            <text class="text-xs text-gray-400">
                              {item.gender === "male" ? "男" : "女"}
                            </text>
                          </view>
                          <view class={`text-xs text-gray-400 mt-0.5 ${isLocked ? "blur-[2px]" : ""}`}>
                            {{ item.desc }} {{ item.subtitle }}
                          </view>
                        </view>
    
                        <!--   -->
                        <view class={`text-right ${isLocked ? "blur-[3px]" : ""}`}>
                          <view class="flex gap-0.5 justify-end text-sm font-medium">
                            {item.bazi.slice(0, 4).map((char, i) => (
                              <text key={i} class={wuxingColors[char] || "text-gray-700"}>{{ char }}</text>
                            ))}
                          </view>
                          <view class="flex gap-0.5 justify-end text-sm font-medium mt-0.5">
                            {item.bazi.slice(4, 8).map((char, i) => (
                              <text key={i} class={wuxingColors[char] || "text-gray-700"}>{{ char }}</text>
                            ))}
                          </view>
                        </view>
    
                        <!--   -->
                        <view class={`w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center ${isLocked ? "blur-[2px]" : ""}`}>
                          <text class="text-amber-400 text-xs font-medium">{{ item.zodiac }}</text>
                        </view>
                      </view>
                    )
                  })}
                </view>
              ))}
            </view>
    
            <!--   -->
            <view class="fixed right-1 top-1/2 -translate-y-1/2 flex flex-col items-center text-[10px] text-muted-foreground">
              
    <view v-for="(letter, index) in availableLetters" :key="index"> (
                <view class="v0-btn"
                  key={{ letter }}
                  @click={() => scrollToLetter(letter)}
                  class="px-1 py-0.5 hover:text-bronze transition-colors"
                >
                  {{ letter }}
                </view>
              ))}
            </view>
          </view>
    
          <!--   -->
          {!isVip && (
            <view class="bg-card border-t border-border p-4">
              <view class="v0-btn" class="w-full py-3 bg-gradient-to-r from-bronze to-bronze/80 text-white font-medium rounded-full shadow-lg flex items-center justify-center gap-2">
                <Lock class="w-4 h-4" />
                开通钻石会员解锁
              </view>
              <text class="mt-3 text-xs text-muted-foreground text-center leading-relaxed">
                案例库收录了500+八字案例，包含名人案例（君主、商界、文艺、体育等）和大众案例（财运、事业、婚姻、健康等），让您通过真实案例学习验证八字命理。案例数据持续更新中......
              </text>
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
const wuxingColors: Record<string, string> = {
const primaryCategories = ["名人案例", "大众案例"]
const secondaryCategories: Record<string, string[]> = {
const caseData = [
const letterIndex = ["A", "B", "C", "D", "E", "F", "G", "H", "J", "K", "L", "M", "N", "P", "Q", "R", "S", "T", "W", "X", "Y", "Z"]
    const matchSearch = searchQuery === "" || c.name.includes(searchQuery) || c.desc.includes(searchQuery)

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