<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">研究院</text>
      <text class="v0-route">V0: institute/teacher-demand</text>
    </view>
        <view class="min-h-screen bg-background">
          <!--   -->
          <view class="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
            <view class="flex items-center justify-between px-4 py-3">
              <view class="flex items-center gap-3">
                <Link href="/institute/teacher-pool" class="p-1">
                  <ArrowLeft class="w-5 h-5" />
                </Link>
                <text class="text-lg font-semibold">课程需求大厅</text>
              </view>
              <!--   -->
              <view class="flex rounded-lg overflow-hidden border border-border">
                <Button
                  variant={viewMode === "teacher" ? "default" : "ghost"}
                  size="sm"
                  @click={() => setViewMode("teacher")}
                  class="rounded-none text-xs h-7"
                >
                  老师视角
                </Button>
                <Button
                  variant={viewMode === "station" ? "default" : "ghost"}
                  size="sm"
                  @click={() => setViewMode("station")}
                  class="rounded-none text-xs h-7"
                >
                  驿站视角
                </Button>
              </view>
            </view>
          </view>
    
          <!--   -->
          <view class="px-4 py-2 flex gap-2 overflow-x-auto scrollbar-hide border-b border-border">
            
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
            
    <view v-for="(demand, index) in filteredDemands" :key="index"> {
              const status = statusConfig[demand.status]
              return (
                <Link href={`/institute/demands/${demand.id}`} key={{ demand.id }}>
                  <Card class="p-3 hover:bg-secondary/30 transition-colors">
                    <!--   -->
                    <view class="flex items-center gap-2 pb-2 border-b border-border mb-2">
                      <view class="w-8 h-8 rounded-lg bg-info/10 flex items-center justify-center">
                        <Building2 class="w-4 h-4 text-info" />
                      </view>
                      <view class="flex-1 min-w-0">
                        <text class="text-sm font-medium truncate">{{ demand.stationName }}</text>
                        <text class="text-[10px] text-muted-foreground flex items-center gap-1">
                          <MapPin class="w-3 h-3" />
                          {{ demand.stationLocation }}
                        </text>
                      </view>
                      <Badge class={cn("text-[10px]", status.bgColor, status.color)}>
                        {{ status.label }}
                      </Badge>
                    </view>
    
                    <!--   -->
                    <text class="font-medium text-foreground">{{ demand.title }}</text>
                    <text class="text-xs text-muted-foreground mt-1 line-clamp-2">{{ demand.description }}</text>
    
                    <!--   -->
                    <view class="flex flex-wrap gap-1 mt-2">
                      <Badge variant="secondary" class="text-[10px]">{{ demand.specialty }}</Badge>
                      <Badge variant="secondary" class="text-[10px]">{{ demand.duration }}</Badge>
                      <Badge variant="secondary" class="text-[10px]">{{ demand.studentCount }}人班</Badge>
                    </view>
    
                    <!--   -->
                    <view class="flex items-center justify-between mt-3 pt-2 border-t border-border">
                      <view class="flex items-center gap-3 text-[10px] text-muted-foreground">
                        <text class="flex items-center gap-1">
                          <Calendar class="w-3 h-3" />
                          {demand.date.split(" ")[0]}
                        </text>
                        <text class="flex items-center gap-1">
                          <Users class="w-3 h-3" />
                          {{ demand.applicants }}人申请
                        </text>
                      </view>
                      <view class="text-right">
                        <text class="text-[10px] text-muted-foreground">预算 </text>
                        <text class="text-sm font-medium text-primary">
                          ¥{{ (demand.budget.min / 1000).toFixed(0) }}k-{{ (demand.budget.max / 1000).toFixed(0) }}k
                        </text>
                      </view>
                    </view>
    
                    <!--   -->
                    {viewMode === "teacher" && demand.status === "recruiting" && (
                      <Button size="sm" class="w-full mt-3 text-xs">
                        申请授课
                      </Button>
                    )}
                  </Card>
                </Link>
              )
            })}
          </view>
    
          <!--   -->
          {viewMode === "station" && (
            <view class="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border">
              <Link href="/institute/demands/create">
                <Button class="w-full">
                  <Plus class="w-4 h-4 mr-2" />
                  发布课程需求
                </Button>
              </Link>
            </view>
          )}
    
          {viewMode === "station" && <view class="h-20" />}
        </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'

const loading = ref(true)
const error = ref<string | null>(null)

// V0 原始数据
const statusConfig: Record<DemandStatus, { label: string; color: string; bgColor: string }> = {
const mockDemands: TeacherDemand[] = [
const tabs = [

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