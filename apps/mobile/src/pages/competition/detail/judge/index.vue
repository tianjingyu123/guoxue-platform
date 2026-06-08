<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">比赛</text>
      <text class="v0-route">V0: competition/[id]/judge</text>
    </view>
        <view class="min-h-screen bg-background pb-24">
          <!--   -->
          <view class="sticky top-0 z-50 bg-card border-b border-border">
            <view class="flex items-center justify-between px-4 h-11">
              <view class="v0-btn" @click={() => router.back()} class="flex items-center">
                <ArrowLeft class="w-5 h-5" />
              </view>
              <text class="font-medium">评审打分</text>
              <Badge variant="secondary">
                {{ completedCount }}/{{ pendingParticipants.length }}
              </Badge>
            </view>
            
            <!--   -->
            <view class="px-4 pb-2">
              <Progress value={{ (completedCount / pendingParticipants.length) * 100 }} class="h-1" />
            </view>
          </view>
    
          <!--   -->
          <view class="px-4 py-3 border-b border-border overflow-x-auto">
            <view class="flex gap-2">
              
    <view v-for="(p, index) in pendingParticipants" :key="index"> (
                <view class="v0-btn"
                  key={{ p.id }}
                  @click={() => setCurrentIndex(index)}
                  class={cn(
                    "px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors flex items-center gap-1.5",
                    index === currentIndex
                      ? "bg-primary text-primary-foreground"
                      : index < completedCount
                      ? "bg-green-100 text-green-700"
                      : "bg-secondary text-muted-foreground"
                  )}
                >
                  {index < completedCount && <CheckCircle class="w-3 h-3" />}
                  {{ p.name }}
                </view>
              ))}
            </view>
          </view>
    
          <!--   -->
          <view class="px-4 py-4">
            <Card class="p-4">
              <view class="flex items-center gap-4">
                <view class="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users class="w-8 h-8 text-primary" />
                </view>
                <view class="flex-1">
                  <view class="flex items-center gap-2">
                    <text class="font-bold text-lg">{{ currentParticipant.name }}</text>
                    <Badge variant="secondary">{{ currentParticipant.group }}</Badge>
                  </view>
                  <text class="text-sm text-muted-foreground">
                    编号: {{ currentParticipant.participantNo }}
                  </text>
                  <text class="text-sm text-muted-foreground">
                    {{ currentParticipant.roundName }} · 第 {{ currentIndex + 1 }} 位选手
                  </text>
                </view>
              </view>
            </Card>
          </view>
    
          <!--   -->
          <view class="px-4 space-y-4">
            <Card class="p-4">
              <view class="flex items-center justify-between mb-4">
                <text class="font-medium">多维度评分</text>
                <view class="text-right">
                  <text class="text-2xl font-bold text-primary">{{ totalScore }}</text>
                  <text class="text-muted-foreground">/{{ maxTotalScore }}</text>
                </view>
              </view>
              
              <view class="space-y-6">
                
    <view v-for="(dim, index) in scoreDimensions" :key="index"> (
                  <view key={dim.id}>
                    <view class="flex items-center justify-between mb-2">
                      <view>
                        <text class="font-medium">{{ dim.name }}</text>
                        <text class="text-xs text-muted-foreground ml-2">{{ dim.description }}</text>
                      </view>
                      <text class="font-bold text-lg text-primary">{{ scores[dim.id] }}</text>
                    </view>
                    <Slider
                      value={{ [scores[dim.id]] }}
                      onValueChange={(value) => handleScoreChange(dim.id, value)}
                      max={{ dim.maxScore }}
                      min={{ 0 }}
                      step={{ 1 }}
                      class="w-full"
                    />
                    <view class="flex justify-between text-xs text-muted-foreground mt-1">
                      <text>0</text>
                      <text>{{ dim.maxScore }}</text>
                    </view>
                  </view>
                ))}
              </view>
            </Card>
    
            <!--   -->
            <Card class="p-4">
              <text class="font-medium mb-3 flex items-center gap-2">
                <MessageSquare class="w-4 h-4" />
                评语（选填）
              </text>
              <Textarea
                placeholder="请输入对该选手的评价和建议..."
                value={{ comment }}
                @change={(e) => setComment(e.target.value)}
                rows={{ 3 }}
              />
            </Card>
          </view>
    
          <!--   -->
          <view class="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4 z-50">
            <view class="flex items-center gap-3">
              <Button
                variant="outline"
                @click={{ goToPrev }}
                :disabled={{ currentIndex === 0 }}
                class="flex-shrink-0"
              >
                <ChevronLeft class="w-4 h-4" />
              </Button>
              
              <Button 
                class="flex-1" 
                @click={() => setShowConfirm(true)}
                :disabled={{ isSubmitting }}
              >
                {isSubmitting ? "提交中..." : "提交评分"}
                <Send class="w-4 h-4 ml-2" />
              </Button>
              
              <Button
                variant="outline"
                @click={{ goToNext }}
                :disabled={{ currentIndex === pendingParticipants.length - 1 }}
                class="flex-shrink-0"
              >
                <ChevronRight class="w-4 h-4" />
              </Button>
            </view>
          </view>
    
          <!--   -->
          <AlertDialog open={{ showConfirm }} onOpenChange={{ setShowConfirm }}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>确认提交评分？</AlertDialogTitle>
                <AlertDialogDescription>
                  <view class="space-y-2 mt-2">
                    <text>选手：{{ currentParticipant.name }}</text>
                    <text>总分：{{ totalScore }}/{{ maxTotalScore }}</text>
                    {{ comment && <text>评语：{comment.slice(0, 50) }}...</text>}
                    <text class="text-muted-foreground text-sm mt-2">
                      提交后将无法修改，请确认后提交。
                    </text>
                  </view>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>返回修改</AlertDialogCancel>
                <AlertDialogAction @click={{ handleSubmit }}>确认提交</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'

const loading = ref(true)
const error = ref<string | null>(null)

// V0 原始数据
const currentParticipant = {
const scoreDimensions = [
const pendingParticipants = [

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