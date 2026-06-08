<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">研究院</text>
      <text class="v0-route">V0: institute/activities</text>
    </view>
        <view class="min-h-screen bg-background">
          <!--   -->
          <view class="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
            <view class="flex items-center justify-between px-4 py-3">
              <view class="flex items-center gap-3">
                <Link href="/institute" class="p-1">
                  <ArrowLeft class="w-5 h-5" />
                </Link>
                <text class="text-lg font-semibold">研究院活动</text>
              </view>
              <Badge variant="secondary" class="text-xs">
                {{ stats.enrolling }}个报名中
              </Badge>
            </view>
          </view>
    
          <!--   -->
          <view class="px-4 py-3">
            <Card class="p-3 bg-gradient-to-r from-gold/10 to-gold/10 border-gold/20">
              <view class="flex items-start gap-3">
                <view class="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center flex-shrink-0">
                  <AlertCircle class="w-5 h-5 text-gold" />
                </view>
                <view class="flex-1">
                  <text class="text-sm font-medium text-foreground">任务进度提醒</text>
                  <text class="text-xs text-muted-foreground mt-0.5">
                    本月需完成2场线上直播，已完成1场；本季度需完成1次线下交流
                  </text>
                  <Link href="/mine/institute" class="text-xs text-gold mt-1 inline-block">
                    查看我的任务 →
                  </Link>
                </view>
              </view>
            </Card>
          </view>
    
          <!--   -->
          <view class="px-4 py-2 flex gap-2 overflow-x-auto scrollbar-hide">
            
    <view v-for="(tab, index) in tabs" :key="index"> (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? "default" : "outline"}
                size="sm"
                @click={() => setActiveTab(tab.id)}
                class={cn(
                  "rounded-full text-xs flex-shrink-0",
                  activeTab === tab.id && "bg-primary text-primary-foreground"
                )}
              >
                {{ tab.label }}
              </Button>
            ))}
          </view>
    
          <!--   -->
          <view class="px-4 py-3 space-y-3">
            
    <view v-for="(activity, index) in filteredActivities" :key="index"> {
              const type = typeConfig[activity.type]
              const status = statusConfig[activity.status]
              return (
                <Link href={`/institute/activities/${activity.id}`} key={{ activity.id }}>
                  <Card class="overflow-hidden hover:bg-secondary/30 transition-colors">
                    <!--   -->
                    <view class="relative h-32 bg-gradient-to-br from-gold/20 to-gold/20 flex items-center justify-center">
                      {activity.status === "ongoing" && (
                        <view class="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 rounded-full bg-primary text-white text-[10px]">
                          <text class="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                          直播中
                        </view>
                      )}
                      <view class="text-center">
                        <view class="w-12 h-12 mx-auto mb-2 rounded-full bg-white/80 flex items-center justify-center">
                          {activity.type === "online_live" ? (
                            <Video class="w-6 h-6 text-info" />
                          ) : (
                            <MapPin class="w-6 h-6 text-success" />
                          )}
                        </view>
                        <Badge class={cn("text-[10px]", type.bgColor, type.color)}>
                          {{ type.label }}
                        </Badge>
                      </view>
                      <!--   -->
                      {activity.isRequired && (
                        <view class="absolute top-2 right-2">
                          <Badge class="text-[10px] bg-amber-500/10 text-amber-600">
                            计入{activity.taskType === "monthly" ? "月度" : activity.taskType === "quarterly" ? "季度" : "年度"}任务
                          </Badge>
                        </view>
                      )}
                    </view>
                    
                    <!--   -->
                    <view class="p-3">
                      <view class="flex items-start justify-between gap-2">
                        <text class="font-medium text-sm text-foreground line-clamp-1">{{ activity.title }}</text>
                        <Badge class={cn("text-[10px] flex-shrink-0", status.bgColor, status.color)}>
                          {{ status.label }}
                        </Badge>
                      </view>
                      
                      {activity.summary && (
                        <text class="text-xs text-muted-foreground mt-1 line-clamp-2">{{ activity.summary }}</text>
                      )}
                      
                      <view class="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                        <text class="flex items-center gap-1">
                          <Calendar class="w-3 h-3" />
                          {{ activity.date }}
                        </text>
                        <text class="flex items-center gap-1">
                          <Clock class="w-3 h-3" />
                          {{ activity.time }}
                        </text>
                        <text class="flex items-center gap-1">
                          <Users class="w-3 h-3" />
                          {{ activity.participants }}{activity.maxParticipants ? `/${activity.maxParticipants}` : ""}人
                        </text>
                      </view>
                      
                      <view class="flex items-center justify-between mt-2 pt-2 border-t border-border">
                        <view class="flex items-center gap-2">
                          <view class="w-5 h-5 rounded-full bg-gold/20 flex items-center justify-center text-[10px] font-bold text-gold">
                            {{ activity.host.slice(0, 1) }}
                          </view>
                          <text class="text-xs text-muted-foreground">{{ activity.host }} 主持</text>
                        </view>
                        <text class="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin class="w-3 h-3" />
                          {activity.location.length > 10 ? activity.location.slice(0, 10) + "..." : activity.location}
                        </text>
                      </view>
                    </view>
                  </Card>
                </Link>
              )
            })}
          </view>
    
          <!--   -->
          {filteredActivities.length === 0 && (
            <view class="text-center py-12">
              <Calendar class="w-12 h-12 mx-auto text-muted-foreground/50" />
              <text class="mt-3 text-muted-foreground">暂无相关活动</text>
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
const typeConfig: Record<ActivityType, { label: string; color: string; bgColor: string }> = {
const statusConfig: Record<ActivityStatus, { label: string; color: string; bgColor: string }> = {
const mockActivities: InstituteActivity[] = [
const tabs = [
  const stats = {

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