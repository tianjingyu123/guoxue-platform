<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">直播</text>
      <text class="v0-route">V0: creator/live/schedule</text>
    </view>
        <view class="min-h-screen bg-background pb-20">
          <!--   -->
          <view class="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border">
            <view class="flex items-center justify-between px-4 h-14">
              <view class="flex items-center gap-3">
                <view class="v0-btn" @click={() => router.back()}>
                  <ChevronLeft class="w-6 h-6" />
                </view>
                <text class="text-lg font-semibold">直播排期管理</text>
              </view>
              <view class="flex items-center gap-2">
                <Button variant="outline" size="sm" @click={() => setShowImportDialog(true)}>
                  <Upload class="w-4 h-4 mr-1.5" />
                  导入
                </Button>
                <Button size="sm" @click={() => router.push("/creator/live/create")}>
                  <Plus class="w-4 h-4 mr-1.5" />
                  新建场次
                </Button>
              </view>
            </view>
          </view>
          
          <!--   -->
          <view class="px-4 py-3 border-b border-border">
            <view class="flex items-center justify-between gap-3">
              <!--   -->
              <view class="flex items-center gap-1 p-1 bg-secondary rounded-lg">
                <view class="v0-btn"
                  @click={() => setViewMode("calendar")}
                  class={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors",
                    viewMode === "calendar" ? "bg-background shadow-sm" : "text-muted-foreground"
                  )}
                >
                  <CalendarDays class="w-4 h-4" />
                  日历
                </view>
                <view class="v0-btn"
                  @click={() => setViewMode("list")}
                  class={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors",
                    viewMode === "list" ? "bg-background shadow-sm" : "text-muted-foreground"
                  )}
                >
                  <List class="w-4 h-4" />
                  列表
                </view>
              </view>
              
              <!--   -->
              <view class="flex-1 max-w-xs relative">
                <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="搜索直播..."
                  value={{ searchQuery }}
                  @change={(e) => setSearchQuery(e.target.value)}
                  class="pl-9 h-9"
                />
              </view>
            </view>
            
            <!--   -->
            <view class="flex items-center gap-2 mt-3 overflow-x-auto scrollbar-hide">
              {[
                { key: "all", label: "全部" },
                { key: "scheduled", label: "待开播" },
                { key: "live", label: "直播中" },
                { key: "completed", label: "已结束" },
              ].map(item => (
                <view class="v0-btn"
                  key={{ item.key }}
                  @click={() => setFilterStatus(item.key)}
                  class={cn(
                    "flex-shrink-0 px-3 py-1.5 rounded-full text-sm transition-colors",
                    filterStatus === item.key 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  )}
                >
                  {{ item.label }}
                </view>
              ))}
            </view>
          </view>
          
          <!--   -->
          {viewMode === "calendar" && (
            <view class="px-4 py-4">
              <!--   -->
              <view class="flex items-center justify-between mb-4">
                <view class="v0-btn" @click={() => changeMonth(-1)} class="w-8 h-8 rounded-full hover:bg-secondary flex items-center justify-center">
                  <ChevronLeft class="w-5 h-5" />
                </view>
                <text class="text-lg font-semibold">{{ year }}年{{ monthNames[month] }}</text>
                <view class="v0-btn" @click={() => changeMonth(1)} class="w-8 h-8 rounded-full hover:bg-secondary flex items-center justify-center">
                  <ChevronRight class="w-5 h-5" />
                </view>
              </view>
              
              <!--   -->
              <view class="grid grid-cols-7 gap-1 mb-2">
                
    <view v-for="(day, index) in weekDays" :key="index"> (
                  <view key={day} class="text-center text-xs text-muted-foreground py-2">
                    {{ day }}
                  </view>
                ))}
              </view>
              
              <!--   -->
              <view class="grid grid-cols-7 gap-1">
                
    <view v-for="(day, index) in calendarDays" :key="index"> {
                  if (day === null) {
                    return <view key={`empty-${index}`} class="aspect-square" />
                  }
                  
                  const dateStr = `${{ year }}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
                  const schedules = getSchedulesForDate(day)
                  const isSelected = selectedDate === dateStr
                  const isToday = dateStr === "2026-05-10" // 模拟今天
                  
                  return (
                    <view class="v0-btn"
                      key={{ day }}
                      @click={() => setSelectedDate(isSelected ? null : dateStr)}
                      class={cn(
                        "aspect-square rounded-lg p-1 flex flex-col items-center justify-start transition-colors relative",
                        isSelected ? "bg-primary/10 ring-2 ring-primary" : "hover:bg-secondary",
                        isToday && !isSelected && "bg-accent"
                      )}
                    >
                      <text class={cn(
                        "text-sm font-medium",
                        isToday && "text-primary"
                      )}>
                        {{ day }}
                      </text>
                      
                      <!--   -->
                      {schedules.length > 0 && (
                        <view class="flex items-center gap-0.5 mt-0.5">
                          {schedules.slice(0, 3).map((s, i) => (
                            <view
                              key={i}
                              class={cn(
                                "w-1.5 h-1.5 rounded-full",
                                s.status === "scheduled" ? "bg-blue-500" :
                                s.status === "live" ? "bg-red-500" :
                                "bg-gray-400"
                              )}
                            />
                          ))}
                          {schedules.length > 3 && (
                            <text class="text-[8px] text-muted-foreground">+{{ schedules.length - 3 }}</text>
                          )}
                        </view>
                      )}
                    </view>
                  )
                })}
              </view>
              
              <!--   -->
              {selectedDate && (
                <view class="mt-4 pt-4 border-t border-border">
                  <text class="text-sm font-medium mb-3">
                    {{ formatDate(selectedDate) }} 的直播 ({{ filteredSchedules.length }}场)
                  </text>
                  {filteredSchedules.length === 0 ? (
                    <view class="text-center py-8 text-muted-foreground">
                      <Calendar class="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <text class="text-sm">当日暂无直播排期</text>
                      <Button variant="outline" size="sm" class="mt-3" @click={() => router.push("/creator/live/create")}>
                        <Plus class="w-4 h-4 mr-1.5" />
                        新建场次
                      </Button>
                    </view>
                  ) : (
                    <view class="space-y-3">
                      
    <view v-for="(schedule, index) in filteredSchedules" :key="index"> (
                        <ScheduleCard 
                          key={schedule.id} 
                          schedule={{ schedule }} 
                          onEdit={() => router.push(`/creator/live/create?id=${schedule.id}`)}
                          onCopy={() => handleCopy(schedule)}
                          onDelete={() => handleDelete(schedule)}
                        />
                      ))}
                    </view>
                  )}
                </view>
              )}
            </view>
          )}
          
          <!--   -->
          {viewMode === "list" && (
            <view class="px-4 py-4">
              <!--   -->
              <view class="grid grid-cols-3 gap-3 mb-4">
                <Card class="p-3 text-center">
                  <text class="text-2xl font-bold text-blue-600">
                    {mockSchedules.filter(s => s.status === "scheduled").length}
                  </text>
                  <text class="text-xs text-muted-foreground mt-1">待开播</text>
                </Card>
                <Card class="p-3 text-center">
                  <text class="text-2xl font-bold text-red-600">
                    {mockSchedules.filter(s => s.status === "live").length}
                  </text>
                  <text class="text-xs text-muted-foreground mt-1">直播中</text>
                </Card>
                <Card class="p-3 text-center">
                  <text class="text-2xl font-bold text-gray-600">
                    {mockSchedules.filter(s => s.status === "completed").length}
                  </text>
                  <text class="text-xs text-muted-foreground mt-1">已结束</text>
                </Card>
              </view>
              
              <!--   -->
              {filteredSchedules.length === 0 ? (
                <view class="text-center py-12 text-muted-foreground">
                  <CalendarDays class="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <text class="text-sm">暂无直播排期</text>
                  <Button class="mt-4" @click={() => router.push("/creator/live/create")}>
                    <Plus class="w-4 h-4 mr-1.5" />
                    创建第一场直播
                  </Button>
                </view>
              ) : (
                <view class="space-y-3">
                  
    <view v-for="(schedule, index) in filteredSchedules" :key="index"> (
                    <ScheduleCard 
                      key={schedule.id} 
                      schedule={{ schedule }} 
                      showDate
                      onEdit={() => router.push(`/creator/live/create?id=${schedule.id}`)}
                      onCopy={() => handleCopy(schedule)}
                      onDelete={() => handleDelete(schedule)}
                    />
                  ))}
                </view>
              )}
            </view>
          )}
          
          <!--   -->
          <Dialog open={{ showNewDialog }} onOpenChange={{ setShowNewDialog }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>新建直播场次</DialogTitle>
                <DialogDescription>选择创建方式</DialogDescription>
              </DialogHeader>
              <view class="grid grid-cols-2 gap-3 py-4">
                <view class="v0-btn"
                  @click={() => {
                    setShowNewDialog(false)
                    router.push("/creator/live/create")
                  }}
                  class="p-4 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-colors text-center"
                >
                  <Plus class="w-8 h-8 mx-auto mb-2 text-primary" />
                  <text class="font-medium">单场直播</text>
                  <text class="text-xs text-muted-foreground mt-1">创建独立直播场次</text>
                </view>
                <view class="v0-btn"
                  @click={() => {
                    setShowNewDialog(false)
                    router.push("/creator/live/create?series=true")
                  }}
                  class="p-4 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-colors text-center"
                >
                  <CalendarDays class="w-8 h-8 mx-auto mb-2 text-primary" />
                  <text class="font-medium">系列直播</text>
                  <text class="text-xs text-muted-foreground mt-1">批量创建多场直播</text>
                </view>
              </view>
            </DialogContent>
          </Dialog>
          
          <!--   -->
          <Dialog open={{ showImportDialog }} onOpenChange={{ setShowImportDialog }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>批量导入场次</DialogTitle>
                <DialogDescription>通过Excel文件批量导入直播排期</DialogDescription>
              </DialogHeader>
              <view class="py-4">
                <!--   -->
                <view class="flex items-center justify-between p-3 bg-secondary rounded-lg mb-4">
                  <view class="flex items-center gap-2">
                    <FileSpreadsheet class="w-5 h-5 text-green-600" />
                    <text class="text-sm">排期导入模板.xlsx</text>
                  </view>
                  <Button variant="ghost" size="sm">
                    <Download class="w-4 h-4 mr-1.5" />
                    下载模板
                  </Button>
                </view>
                
                <!--   -->
                <view class="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 transition-colors cursor-pointer">
                  <Upload class="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                  <text class="text-sm font-medium mb-1">点击或拖拽文件到此处</text>
                  <text class="text-xs text-muted-foreground">支持 .xlsx, .xls 格式，单次最多100条</text>
                </view>
              </view>
              <DialogFooter>
                <Button variant="outline" @click={() => setShowImportDialog(false)}>取消</Button>
                <Button>开始导入</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          <!--   -->
          <Dialog open={{ showDeleteDialog }} onOpenChange={{ setShowDeleteDialog }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>确认删除</DialogTitle>
                <DialogDescription>
                  确定要删除直播「{{ selectedSchedule?.title }}」吗？此操作不可恢复。
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" @click={() => setShowDeleteDialog(false)}>取消</Button>
                <Button variant="destructive" @click={() => {
                  console.log("删除场次:", selectedSchedule?.id)
                  setShowDeleteDialog(false)
                }}>
                  确认删除
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'

const loading = ref(true)
const error = ref<string | null>(null)

// V0 原始数据
const mockSchedules = [
  const days: (number | null)[] = []
const statusConfig = {
  const monthNames = ["一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"]
  const weekDays = ["日", "一", "二", "三", "四", "五", "六"]
              const isToday = dateStr === "2026-05-10" // 模拟今天

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