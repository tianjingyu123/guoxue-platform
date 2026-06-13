<template>
  <view class="page" data-v0-route="about">
        <view class="min-h-screen bg-background flex flex-col">
          
          <view class="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border safe-area-pt">
            <view class="flex items-center gap-3 px-4 h-14">
              <!-- component:link -->
                
              <!-- /component:link -->
              <text class="font-semibold text-lg text-foreground">关于我们</text>
            </view>
          </view>
    
          <view class="flex-1">
            
            <view class="bg-gradient-to-br from-primary/10 to-gold/10 p-8 text-center">
              <view class="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg">
                <svg viewBox="0 0 24 24" class="w-12 h-12">
                  <circle cx="12" cy="12" r="11" fill="white" />
                  <path d="M12 1 A5.5 5.5 0 0 1 12 12 A5.5 5.5 0 0 0 12 23 A11 11 0 0 1 12 1" fill="#C41E3A" />
                  <circle cx="12" cy="6.5" r="2" fill="white" />
                  <circle cx="12" cy="17.5" r="2" fill="#C41E3A" />
                </svg>
              </view>
              <text class="text-2xl font-bold text-foreground mb-2">热卜国学</text>
              <text class="text-muted-foreground">传承智慧 · 启迪人生</text>
            </view>
    
            <view class="p-6">
              <text class="text-muted-foreground leading-relaxed mb-6">
                热卜国学是一个专注于中华传统文化传承与学习的综合性平台。我们汇聚了易经、风水、命理、中医养生等领域的专家学者，
                致力于让国学智慧以现代化的方式传播，帮助更多人了解和受益于中华传统文化的精髓。
              </text>
    
              <view class="grid grid-cols-3 gap-4 mb-8">
                <!-- component:card -->
                  <text class="text-2xl font-bold text-primary">100+</text>
                  <text class="text-xs text-muted-foreground mt-1">专家讲师</text>
                <!-- /component:card -->
                <!-- component:card -->
                  <text class="text-2xl font-bold text-gold">500+</text>
                  <text class="text-xs text-muted-foreground mt-1">精品课程</text>
                <!-- /component:card -->
                <!-- component:card -->
                  <text class="text-2xl font-bold text-success">50万+</text>
                  <text class="text-xs text-muted-foreground mt-1">学习用户</text>
                <!-- /component:card -->
              </view>
    
              <text class="font-bold text-foreground mb-4">我们的特色</text>
              <view class="space-y-3 mb-8">
                "",
                  "",
                  "",
                  "",
                ].map(item => (
                  <!-- component:card -->
                    <view class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <item.icon class="w-5 h-5 text-primary" />
                    </view>
                    <view>
                      <text class="font-medium text-foreground">""}</text>
                      <text class="text-sm text-muted-foreground">""}</text>
                    </view>
                  <!-- /component:card -->
                ))}
              </view>
    
              <text class="font-bold text-foreground mb-4">联系我们</text>
              <!-- component:card -->
                <!-- component:link -->
                  <text class="text-foreground">意见反馈</text>
                  
                <!-- /component:link -->
                <view class="p-4 flex items-center justify-between">
                  <text class="text-foreground">客服邮箱</text>
                  <text class="text-muted-foreground">support@rebu.com</text>
                </view>
                <view class="p-4 flex items-center justify-between">
                  <text class="text-foreground">官方微信</text>
                  <text class="text-muted-foreground">rebu_guoxue</text>
                </view>
              <!-- /component:card -->
    
              <view class="mt-8 text-center text-sm text-muted-foreground">
                <text>版本 1.0.0</text>
                <text class="mt-1">Copyright © 2024 热卜国学</text>
              </view>
            </view>
          </view>
        </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'

const loading = ref(true)
const error = ref<string | null>(null)

onMounted(() => { loading.value = false })
onPullDownRefresh(() => { setTimeout(() => uni.stopPullDownRefresh(), 500) })
</script>

<style scoped>
.page {
  background: #FAF8F5;
  min-height: 100vh;
}

.hr { height: 1px; background: #E8E0D5; margin: 24rpx 0; }
</style>