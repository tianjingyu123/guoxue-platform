<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">分享</text>
      <text class="v0-route">V0: share/landing</text>
    </view>
          <view class="space-y-4">
            <view class="relative aspect-video rounded-xl overflow-hidden">
              <image 
                src={{ course.cover as string }} 
                alt={{ course.title as string }}
                class="w-full h-full object-cover"
              />
              <view class="absolute inset-0 bg-black/30 flex items-center justify-center">
                <view class="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center">
                  <Play class="w-8 h-8 text-primary ml-1" />
                </view>
              </view>
              <Badge class="absolute top-3 left-3 bg-primary">精品课程</Badge>
            </view>
            
            <text class="text-xl font-bold">{{ course.title as string }}</text>
            
            <view class="flex items-center gap-3">
              <Avatar class="w-10 h-10">
                <AvatarImage src={{ teacher.avatar }} />
                <AvatarFallback>{{ teacher.name[0] }}</AvatarFallback>
              </Avatar>
              <view>
                <text class="font-medium">{{ teacher.name }}</text>
                <text class="text-xs text-muted-foreground">{{ teacher.title }}</text>
              </view>
            </view>
            
            <view class="flex items-center gap-4 text-sm text-muted-foreground">
              <text class="flex items-center gap-1">
                <Users class="w-4 h-4" />{{ (course.studentCount as number).toLocaleString() }}人学习
              </text>
              <text class="flex items-center gap-1">
                <Star class="w-4 h-4 text-amber-500" />{{ course.rating as number }}分
              </text>
              <text class="flex items-center gap-1">
                <BookOpen class="w-4 h-4" />{{ course.lessons as number }}节
              </text>
            </view>
            
            <view class="flex items-baseline gap-2">
              <text class="text-2xl font-bold text-primary">¥{{ course.price as number }}</text>
              <text class="text-sm text-muted-foreground line-through">¥{{ course.originalPrice as number }}</text>
            </view>
            
            <Card class="p-4 bg-muted/30">
              <text class="text-sm text-muted-foreground line-clamp-3">{{ course.description as string }}</text>
            </Card>
          </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'

const loading = ref(true)
const error = ref<string | null>(null)

// V0 原始数据
  const contents: Record<ShareType, object> = {
    const icons: Record<ShareType, React.ReactNode> = {
    const labels: Record<ShareType, string> = {

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