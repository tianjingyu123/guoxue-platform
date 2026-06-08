<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">欢迎页</text>
      <text class="v0-route">V0: welcome</text>
    </view>
    ) => timers.forEach(clearTimeout)
      }, [])
    
      // 倒计时
      useEffect(() => {{ if (countdown <= 0) {
          handleNavigate()
          return }}
        
        const timer = setTimeout(() => {
          setCountdown(prev => prev - 1)
        }, 1000)
        
        return () => clearTimeout(timer)
      }, [countdown, handleNavigate])
    
      return (
        <view class="fixed inset-0 bg-gradient-to-b from-[#1a1a2e] via-[#16213e] to-[#0f0f23] overflow-hidden">
          <!--   -->
          <view class="absolute inset-0">
            <!--   -->
            {[...Array(30)].map((_, i) => (
              <view
                key={i}
                class="absolute w-1 h-1 bg-white rounded-full animate-pulse"
                :style="
                  left: `${{ Math.random() * 100 }}%`,
                  top: `${{ Math.random() * 100 }}%`,
                  animationDelay: `${{ Math.random() * 2 }}s`,
                  opacity: Math.random() * 0.5 + 0.3,
                }}
              />
            ))}
            
            <!--   -->
            <view class="absolute top-1/4 left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-[#C9A96E]/10 rounded-full blur-[100px]" />
            <view class="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-[300px] h-[300px] bg-[#C41E3A]/10 rounded-full blur-[80px]" />
          </view>
    
          <!--   -->
          <view class="relative z-10 flex flex-col items-center justify-center min-h-screen px-8">
            <!--   -->
            <view 
              class={`mb-8 transition-all duration-700 ease-out ${
                showContent ? "opacity-100 scale-100" : "opacity-0 scale-90"
              }`}
            >
              <view class="w-20 h-20 rounded-full bg-gradient-to-br from-[#C9A96E] to-[#A67C52] flex items-center justify-center shadow-[0_0_40px_rgba(201,169,110,0.4)]">
                <svg class="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={{ 1.5 }} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </view>
            </view>
    
            <!--   -->
            <view 
              class={`text-center transition-all duration-700 ease-out delay-100 ${
                showContent ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              }`}
            >
              <text class="text-2xl font-serif font-bold text-white mb-2">
                {userName ? `${userName}，` : ""}欢迎来到
              </text>
              <text class="text-3xl font-serif font-bold bg-gradient-to-r from-[#C9A96E] to-[#E8D5B0] bg-clip-text text-transparent">
                热卜国学
              </text>
            </view>
    
            <!--   -->
            <text 
              class={`mt-6 text-[15px] text-white/70 text-center leading-relaxed transition-all duration-700 ease-out ${
                showSlogan ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              }`}
            >
              探寻东方智慧，传承千年文化
              <text>
    </text> />
              <text class="text-[13px] text-white/50">开启你的国学之旅</text>
            </text>
    
            <!--   -->
            <view class="v0-btn"
              @click={{ handleNavigate }}
              :disabled={{ hasInterests === null }}
              class={`mt-12 px-10 py-3 rounded-full bg-gradient-to-r from-[#C41E3A] to-[#9B1B30] text-white font-medium text-[15px] shadow-[0_4px_20px_rgba(196,30,58,0.4)] active:scale-95 transition-all duration-300 ${
                showButton ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              } disabled:opacity-50`}
            >
              {hasInterests === null ? "加载中..." : (
                
                  进入平台
                  <text class="ml-2 text-white/70">({{ countdown }}s)</text>
                
              )}
            </view>
    
            <!--   -->
            <view 
              class={`mt-16 flex items-center gap-4 transition-all duration-700 delay-500 ${
                showButton ? "opacity-100" : "opacity-0"
              }`}
            >
              <view class="w-12 h-px bg-gradient-to-r from-transparent to-[#C9A96E]/50" />
              <view class="w-1.5 h-1.5 rounded-full bg-[#C9A96E]/50" />
              <view class="w-12 h-px bg-gradient-to-l from-transparent to-[#C9A96E]/50" />
            </view>
    
            <!--   -->
            <text 
              class={`mt-6 text-[12px] text-white/40 transition-all duration-700 delay-700 ${
                showButton ? "opacity-100" : "opacity-0"
              }`}
            >
              {hasInterests ? "即将进入首页" : "即将进入兴趣选择"}
            </text>
          </view>
    
          <!--   -->
          <view class="absolute bottom-8 left-0 right-0 text-center">
            <text class="text-[11px] text-white/30">
              热卜国学 - 传承东方智慧
            </text>
          </view>
    
          <!--   -->
          <style jsx>{`
            @keyframes pulse {
              0%, 100% { opacity: 0.3; }
              50% { opacity: 0.8; }
            }
          `}</style>
        </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'

const loading = ref(true)
const error = ref<string | null>(null)

// V0 原始数据
    const timers: NodeJS.Timeout[] = []

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