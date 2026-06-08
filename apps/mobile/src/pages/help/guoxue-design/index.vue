<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">帮助中心</text>
      <text class="v0-route">V0: help/guoxue-design</text>
    </view>
        <view class="min-h-screen bg-background">
          <!--   -->
          <view class="sticky top-0 z-40 bg-card border-b border-border px-4 py-3 flex items-center gap-3">
            <Link href="/help" class="p-1">
              <ArrowLeft class="w-5 h-5" />
            </Link>
            <text class="font-semibold">国学风格设计演示</text>
          </view>
    
          <view class="p-4 space-y-6">
            <!--   -->
            <Card class="overflow-hidden">
              <view class="px-4 py-3 border-b border-border bg-secondary/30">
                <text class="font-medium">空状态组件</text>
                <text class="text-xs text-muted-foreground">展示国学韵味的空状态文案和视觉</text>
              </view>
              
              <!--   -->
              <view class="p-4 border-b border-border">
                <view class="flex flex-wrap gap-2">
                  
    <view v-for="(type, index) in emptyStateTypes" :key="index"> (
                    <Button
                      key={type}
                      variant={activeEmptyState === type ? "default" : "outline"}
                      size="sm"
                      @click={() => setActiveEmptyState(type)}
                      class="text-xs"
                    >
                      {{ type }}
                    </Button>
                  ))}
                </view>
              </view>
              
              <!--   -->
              <view class="bg-background">
                <EmptyState type={{ activeEmptyState }} />
              </view>
            </Card>
    
            <!--   -->
            <Card class="overflow-hidden">
              <view class="px-4 py-3 border-b border-border bg-secondary/30">
                <text class="font-medium">状态反馈组件</text>
                <text class="text-xs text-muted-foreground">印章风格的成功/错误/警告反馈</text>
              </view>
              
              <view class="p-4 space-y-4">
                <!--   -->
                <view>
                  <text class="text-sm font-medium mb-2">印章反馈</text>
                  <view class="flex flex-wrap gap-2">
                    <Button @click={() => setShowSealSuccess(true)} class="bg-success hover:bg-success/90">
                      成功印章
                    </Button>
                    <Button @click={() => setShowSealError(true)} variant="destructive">
                      错误印章
                    </Button>
                    <Button @click={() => setShowSealWarning(true)} class="bg-warning hover:bg-warning/90 text-white">
                      警告印章
                    </Button>
                  </view>
                </view>
    
                <!--   -->
                <view>
                  <text class="text-sm font-medium mb-2">Toast反馈</text>
                  <view class="flex flex-wrap gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      @click={() => { setToastType("success"); setShowToast(true) }}
                    >
                      成功Toast
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      @click={() => { setToastType("error"); setShowToast(true) }}
                    >
                      错误Toast
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      @click={() => { setToastType("warning"); setShowToast(true) }}
                    >
                      警告Toast
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      @click={() => { setToastType("info"); setShowToast(true) }}
                    >
                      信息Toast
                    </Button>
                  </view>
                </view>
    
                <!--   -->
                <view>
                  <text class="text-sm font-medium mb-2">仪式感确认弹窗</text>
                  <view class="flex flex-wrap gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      @click={() => { setConfirmType("join"); setShowConfirm(true) }}
                    >
                      加入确认
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      @click={() => { setConfirmType("complete"); setShowConfirm(true) }}
                    >
                      完成确认
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      @click={() => { setConfirmType("unlock"); setShowConfirm(true) }}
                    >
                      解锁确认
                    </Button>
                  </view>
                </view>
              </view>
            </Card>
    
            <!--   -->
            <Card class="overflow-hidden">
              <view class="px-4 py-3 border-b border-border bg-secondary/30">
                <text class="font-medium">加载动画</text>
                <text class="text-xs text-muted-foreground">太极旋转和多种加载形态</text>
              </view>
              
              <view class="p-6 space-y-6">
                <!--   -->
                <view>
                  <text class="text-sm font-medium mb-4">太极加载器（新）</text>
                  <view class="grid grid-cols-4 gap-4">
                    <view class="flex flex-col items-center gap-2">
                      <TaijiLoader size="sm" showText={{ false }} />
                      <text class="text-xs text-muted-foreground">小</text>
                    </view>
                    <view class="flex flex-col items-center gap-2">
                      <TaijiLoader size="md" showText={{ false }} />
                      <text class="text-xs text-muted-foreground">中</text>
                    </view>
                    <view class="flex flex-col items-center gap-2">
                      <TaijiLoader size="lg" showText={{ false }} />
                      <text class="text-xs text-muted-foreground">大</text>
                    </view>
                    <view class="flex flex-col items-center gap-2">
                      <TaijiLoader size="xl" showText={{ false }} />
                      <text class="text-xs text-muted-foreground">特大</text>
                    </view>
                  </view>
                </view>
                
                <!--   -->
                <view>
                  <text class="text-sm font-medium mb-2">内联加载</text>
                  <InlineLoader />
                </view>
                
                <!--   -->
                <view>
                  <text class="text-sm font-medium mb-4">特色加载动画</text>
                  <view class="grid grid-cols-2 gap-6">
                    <view class="flex flex-col items-center gap-2">
                      <TaijiLoading message="太极加载中..." size="lg" />
                    </view>
                    <view class="flex flex-col items-center gap-2">
                      <BrushLoading message="毛笔加载中..." />
                    </view>
                  </view>
                </view>
              </view>
            </Card>
    
            <!--   -->
            <Card class="overflow-hidden">
              <view class="px-4 py-3 border-b border-border bg-secondary/30">
                <text class="font-medium">国学文案库</text>
                <text class="text-xs text-muted-foreground">引经据典的文案体系</text>
              </view>
              
              <view class="p-4 space-y-3">
                <view class="p-3 bg-secondary/30 rounded-lg">
                  <text class="text-xs text-muted-foreground mb-1">成功反馈</text>
                  <text class="text-sm font-serif">善哉善哉 · 已妥善收藏 · 呈文已递</text>
                </view>
                <view class="p-3 bg-secondary/30 rounded-lg">
                  <text class="text-xs text-muted-foreground mb-1">错误反馈</text>
                  <text class="text-sm font-serif">事与愿违 · 山高路远，通讯受阻</text>
                </view>
                <view class="p-3 bg-secondary/30 rounded-lg">
                  <text class="text-xs text-muted-foreground mb-1">加载提示</text>
                  <text class="text-sm font-serif">稍候片刻 · 正在整理卷宗 · 画卷徐徐展开</text>
                </view>
                <view class="p-3 bg-secondary/30 rounded-lg">
                  <text class="text-xs text-muted-foreground mb-1">成就文案</text>
                  <text class="text-sm font-serif">初入山门 · 开卷有益 · 志同道合 · 持之以恒</text>
                </view>
              </view>
            </Card>
          </view>
    
          <!--   -->
          <SealFeedback 
            type="success" 
            message="操作成功" 
            visible={{ showSealSuccess }} 
            onClose={() => setShowSealSuccess(false)} 
          />
          <SealFeedback 
            type="error" 
            message="操作失败" 
            visible={{ showSealError }} 
            onClose={() => setShowSealError(false)} 
          />
          <SealFeedback 
            type="warning" 
            message="请三思而行" 
            visible={{ showSealWarning }} 
            onClose={() => setShowSealWarning(false)} 
          />
    
          <!--   -->
          <GuoxueToast 
            type={{ toastType }} 
            message={
              toastType === "success" ? "善哉，操作成功" :
              toastType === "error" ? "事与愿违，请重试" :
              toastType === "warning" ? "请三思而行" : "知悉"
            }
            visible={{ showToast }} 
            onClose={() => setShowToast(false)} 
          />
    
          <!--   -->
          <CeremonyConfirm
            visible={{ showConfirm }}
            type={{ confirmType }}
            title={
              confirmType === "join" ? "确认加入圈子？" :
              confirmType === "complete" ? "确认完成学习？" : "确认解锁内容？"
            }
            description={
              confirmType === "join" ? "加入后可参与圈内讨论和学习" :
              confirmType === "complete" ? "完成后将获得结业证书" : "解锁后可查看完整内容"
            }
            confirmText={confirmType === "join" ? "拜入" : "确定"}
            onConfirm={() => setShowConfirm(false)}
            onCancel={() => setShowConfirm(false)}
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
const emptyStateTypes = [

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