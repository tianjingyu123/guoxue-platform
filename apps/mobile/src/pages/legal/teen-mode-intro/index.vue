<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">法律条款</text>
      <text class="v0-route">V0: legal/teen-mode-intro</text>
    </view>
        <view class="min-h-screen bg-background">
          <!--   -->
          <view class="sticky top-0 z-10 bg-background border-b border-border">
            <view class="flex items-center justify-between px-4 py-3">
              <view class="flex items-center gap-3">
                <view class="v0-btn" 
                  @click={() => router.back()}
                  class="p-1 -ml-1 hover:bg-muted rounded-full transition-colors"
                >
                  <ChevronLeft class="w-5 h-5" />
                </view>
                <text class="text-lg font-semibold">青少年模式</text>
              </view>
            </view>
          </view>
    
          <view class="pb-32">
            <!--   -->
            <view class="bg-gradient-to-br from-primary/10 via-primary/5 to-background px-4 py-8 text-center">
              <view class="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield class="w-10 h-10 text-primary" />
              </view>
              <text class="text-xl font-bold text-foreground mb-2">守护青少年健康成长</text>
              <text class="text-sm text-muted-foreground max-w-xs mx-auto">
                青少年模式为未成年用户提供全方位的使用保护，帮助建立健康的数字使用习惯
              </text>
            </view>
    
            <!--   -->
            <view class="p-4 space-y-4">
              <text class="text-base font-semibold text-foreground">核心功能</text>
              
              
    <view v-for="(feature, index) in features" :key="index"> (
                <view 
                  key={index}
                  class="bg-card border border-border rounded-xl p-4"
                >
                  <view class="flex items-start gap-4">
                    <view class={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0",
                      feature.color
                    )}>
                      <feature.icon class="w-6 h-6" />
                    </view>
                    <view class="flex-1 min-w-0">
                      <text class="font-semibold text-foreground mb-1">{{ feature.title }}</text>
                      <text class="text-sm text-muted-foreground mb-3">{{ feature.description }}</text>
                      <view class="space-y-1.5">
                        {feature.details.map((detail, i) => (
                          <view key={i} class="flex items-center gap-2 text-sm">
                            <CheckCircle class="w-4 h-4 text-green-500 flex-shrink-0" />
                            <text class="text-foreground/80">{{ detail }}</text>
                          </view>
                        ))}
                      </view>
                    </view>
                  </view>
                </view>
              ))}
            </view>
    
            <!--   -->
            <view class="p-4">
              <text class="text-base font-semibold text-foreground mb-3">额外保护措施</text>
              <view class="bg-card border border-border rounded-xl divide-y divide-border">
                
    <view v-for="(item, index) in protections" :key="index"> (
                  <view key={index} class="flex items-center gap-3 px-4 py-3">
                    <view class="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                      <item.icon class="w-4 h-4 text-primary" />
                    </view>
                    <text class="text-sm text-foreground">{{ item.text }}</text>
                  </view>
                ))}
              </view>
            </view>
    
            <!--   -->
            <view class="p-4">
              <text class="text-base font-semibold text-foreground mb-3">使用须知</text>
              <view class="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
                <text class="text-sm text-amber-800">
                  <text class="font-medium">1. </text>
                  青少年模式开启后，部分功能将受到限制，如直播打赏、充值消费等。
                </text>
                <text class="text-sm text-amber-800">
                  <text class="font-medium">2. </text>
                  建议由家长或监护人设置密码，并妥善保管。
                </text>
                <text class="text-sm text-amber-800">
                  <text class="font-medium">3. </text>
                  如需关闭青少年模式，需输入设置时的密码。
                </text>
                <text class="text-sm text-amber-800">
                  <text class="font-medium">4. </text>
                  忘记密码可通过"设置 - 青少年模式 - 忘记密码"找回。
                </text>
              </view>
            </view>
    
            <!--   -->
            <view class="p-4">
              <text class="text-base font-semibold text-foreground mb-3">常见问题</text>
              <view class="bg-card border border-border rounded-xl divide-y divide-border">
                <view class="v0-btn" 
                  @click={() => router.push('/help/faq?topic=teen-mode')}
                  class="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/50 transition-colors"
                >
                  <text class="text-sm text-foreground">如何设置青少年模式密码？</text>
                  <ChevronRight class="w-4 h-4 text-muted-foreground" />
                </view>
                <view class="v0-btn" 
                  @click={() => router.push('/help/faq?topic=teen-mode')}
                  class="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/50 transition-colors"
                >
                  <text class="text-sm text-foreground">忘记密码怎么办？</text>
                  <ChevronRight class="w-4 h-4 text-muted-foreground" />
                </view>
                <view class="v0-btn" 
                  @click={() => router.push('/help/faq?topic=teen-mode')}
                  class="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/50 transition-colors"
                >
                  <text class="text-sm text-foreground">青少年模式会限制哪些功能？</text>
                  <ChevronRight class="w-4 h-4 text-muted-foreground" />
                </view>
                <view class="v0-btn" 
                  @click={() => router.push('/help/faq?topic=teen-mode')}
                  class="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/50 transition-colors"
                >
                  <text class="text-sm text-foreground">如何查看孩子的使用记录？</text>
                  <ChevronRight class="w-4 h-4 text-muted-foreground" />
                </view>
              </view>
            </view>
    
            <!--   -->
            <view class="p-4">
              <view class="bg-muted/50 rounded-xl p-4 text-center">
                <text class="text-sm text-muted-foreground mb-2">
                  如有任何问题，欢迎联系我们
                </text>
                <text class="text-sm text-foreground">
                  客服邮箱：<text href="mailto:support@rebu.com" class="text-primary">support@rebu.com</text>
                </text>
              </view>
            </view>
          </view>
    
          <!--   -->
          <view class="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 safe-area-bottom">
            <Button 
              @click={() => router.push('/settings/teen-mode')}
              class="w-full h-12 text-base font-medium"
            >
              <Shield class="w-5 h-5 mr-2" />
              立即开启青少年模式
            </Button>
            <text class="text-xs text-muted-foreground text-center mt-2">
              开启后可随时在"设置"中进行调整
            </text>
          </view>
        </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'

const loading = ref(true)
const error = ref<string | null>(null)

// V0 原始数据
const features = [
const protections = [

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