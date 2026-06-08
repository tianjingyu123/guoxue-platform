<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">演示</text>
      <text class="v0-route">V0: demo/feature-guide</text>
    </view>
        <view class="min-h-screen bg-background">
          <!--   -->
          <FeatureGuide 
            isOpen={{ showDefaultGuide }} 
            onClose={() => setShowDefaultGuide(false)}
            version="2.1.0"
          />
          <FeatureGuide 
            isOpen={{ showCustomGuide }} 
            onClose={() => setShowCustomGuide(false)}
            steps={{ customSteps }}
            version="2.2.0"
          />
    
          <!--   -->
          <view class="relative">
            <!--   -->
            <view class="sticky top-0 z-30 bg-background border-b border-border">
              <view class="flex items-center justify-between px-4 h-14">
                <text class="font-bold text-lg text-foreground">热卜国学</text>
                <view class="flex items-center gap-2">
                  <view class="v0-btn" class="p-2 rounded-full hover:bg-secondary">
                    <Search class="w-5 h-5 text-muted-foreground" />
                  </view>
                  <view class="v0-btn" class="p-2 rounded-full hover:bg-secondary relative">
                    <Bell class="w-5 h-5 text-muted-foreground" />
                    <text class="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
                  </view>
                </view>
              </view>
            </view>
    
            <!--   -->
            <view class="p-4 space-y-6">
              <!--   -->
              <view class="grid grid-cols-4 gap-4">
                {[
                  { icon: Sparkles, label: "AI对话", color: "text-accent" },
                  { icon: Compass, label: "排盘", color: "text-primary" },
                  { icon: BookOpen, label: "古籍", color: "text-accent" },
                  { icon: Users, label: "圈子", color: "text-primary" },
                ].map((item, i) => (
                  <view key={{ i }} class="flex flex-col items-center gap-2">
                    <view class="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center">
                      <item.icon class={`w-6 h-6 ${item.color}`} />
                    </view>
                    <text class="text-xs text-muted-foreground">{{ item.label }}</text>
                  </view>
                ))}
              </view>
    
              <!--   -->
              <Card class="p-4 bg-primary/5 border-primary/20">
                <text class="font-semibold text-base text-foreground mb-3">新功能引导演示</text>
                <text class="text-sm text-muted-foreground mb-4">
                  点击下方按钮体验不同的引导浮层效果
                </text>
                <view class="space-y-3">
                  <Button 
                    @click={() => setShowDefaultGuide(true)}
                    class="w-full"
                  >
                    展示默认引导（5步）
                  </Button>
                  <Button 
                    @click={() => setShowCustomGuide(true)}
                    variant="outline"
                    class="w-full"
                  >
                    展示自定义引导（3步）
                  </Button>
                  <Button 
                    @click={() => {
                      featureGuide.reset()
                      featureGuide.open()
                    }}
                    variant="secondary"
                    class="w-full"
                  >
                    模拟首次访问自动弹出
                  </Button>
                </view>
              </Card>
    
              <!--   -->
              <view class="space-y-3">
                <Card class="p-4">
                  <view class="flex items-center gap-3">
                    <view class="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <MessageCircle class="w-6 h-6 text-primary" />
                    </view>
                    <view class="flex-1">
                      <view class="flex items-center gap-2">
                        <text class="font-medium text-foreground">付费问答</text>
                        <Badge class="bg-primary/10 text-primary text-[10px]">新功能</Badge>
                      </view>
                      <text class="text-xs text-muted-foreground mt-0.5">向专家发起提问</text>
                    </view>
                  </view>
                </Card>
    
                <Card class="p-4">
                  <view class="flex items-center gap-3">
                    <view class="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                      <Sparkles class="w-6 h-6 text-accent" />
                    </view>
                    <view class="flex-1">
                      <view class="flex items-center gap-2">
                        <text class="font-medium text-foreground">AI智能搜索</text>
                        <Badge class="bg-accent/10 text-accent text-[10px]">新功能</Badge>
                      </view>
                      <text class="text-xs text-muted-foreground mt-0.5">用自然语言提问</text>
                    </view>
                  </view>
                </Card>
    
                <Card class="p-4">
                  <view class="flex items-center gap-3">
                    <view class="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                      <Users class="w-6 h-6 text-primary" />
                    </view>
                    <view class="flex-1">
                      <view class="flex items-center gap-2">
                        <text class="font-medium text-foreground">连麦咨询</text>
                        <Badge class="bg-primary/10 text-primary text-[10px]">新功能</Badge>
                      </view>
                      <text class="text-xs text-muted-foreground mt-0.5">与讲师实时交流</text>
                    </view>
                  </view>
                </Card>
              </view>
    
              <!--   -->
              <Card class="p-4">
                <text class="font-medium text-foreground mb-2">组件特性</text>
                <view class="text-sm text-muted-foreground space-y-1.5">
                  <view>• 半透明蒙层 + SVG镂空高亮</view>
                  <view>• 支持多步骤引导，左右滑动切换</view>
                  <view>• 步骤指示器可点击跳转</view>
                  <view>• 键盘方向键和ESC快捷操作</view>
                  <view>• useFeatureGuide Hook 管理状态</view>
                  <view>• localStorage 记录已展示版本</view>
                </view>
              </Card>
            </view>
    
            <!--   -->
            <view class="fixed bottom-0 left-0 right-0 bg-background border-t border-border safe-area-pb">
              <view class="flex items-center justify-around h-14">
                {[
                  { icon: Home, label: "首页" },
                  { icon: Compass, label: "排盘" },
                  { icon: Users, label: "圈子" },
                  { icon: ShoppingBag, label: "商城" },
                  { icon: Settings, label: "我的" },
                ].map((item, i) => (
                  <view class="v0-btn" key={{ i }} class="flex flex-col items-center gap-0.5 px-4 py-1">
                    <item.icon class="w-5 h-5 text-muted-foreground" />
                    <text class="text-[10px] text-muted-foreground">{{ item.label }}</text>
                  </view>
                ))}
              </view>
            </view>
          </view>
    
          <!--   -->
          <FeatureGuide 
            isOpen={{ featureGuide.isOpen }} 
            onClose={{ featureGuide.close }}
            version="demo-2.1.0"
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
const customSteps = [

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