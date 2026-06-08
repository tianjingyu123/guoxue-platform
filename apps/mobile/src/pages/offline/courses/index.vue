<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">课程</text>
      <text class="v0-route">V0: offline/courses</text>
    </view>
        <view class="min-h-screen bg-background pb-20">
          <!--   -->
          <view class="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
            <view class="flex items-center justify-between px-4 h-14">
              <BackButton fallbackPath="/offline" />
              <text class="font-semibold">线下课程</text>
              <view class="w-8" />
            </view>
    
            <!--   -->
            <view class="px-4 pb-3">
              <view class="relative">
                <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="搜索课程、讲师..."
                  value={{ keyword }}
                  @change={(e) => setKeyword(e.target.value)}
                  class="w-full h-10 pl-10 pr-4 rounded-full bg-secondary text-sm outline-none focus:ring-2 focus:ring-primary/20"
                />
              </view>
            </view>
    
            <!--   -->
            <view class="flex items-center gap-2 px-4 pb-3 overflow-x-auto">
              <!--   -->
              <view class="v0-btn"
                @click={() => {
                  setShowStationPicker(!showStationPicker)
                  setShowDatePicker(false)
                }}
                class={cn(
                  "flex items-center gap-1 px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors",
                  selectedStation ? "bg-primary text-primary-foreground" : "bg-secondary"
                )}
              >
                <Building2 class="w-3.5 h-3.5" />
                <text class="max-w-[100px] truncate">{{ selectedStationName }}</text>
                <ChevronDown class="w-3.5 h-3.5" />
              </view>
    
              <!--   -->
              <view class="v0-btn"
                @click={() => {
                  setShowDatePicker(!showDatePicker)
                  setShowStationPicker(false)
                }}
                class={cn(
                  "flex items-center gap-1 px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors",
                  dateFilter !== 'all' ? "bg-primary text-primary-foreground" : "bg-secondary"
                )}
              >
                <Calendar class="w-3.5 h-3.5" />
                <text>{{ selectedDateLabel }}</text>
                <ChevronDown class="w-3.5 h-3.5" />
              </view>
            </view>
    
            <!--   -->
            {showStationPicker && (
              <view class="absolute left-0 right-0 bg-background border-b border-border shadow-lg max-h-64 overflow-y-auto z-40">
                <view class="v0-btn"
                  @click={() => {
                    setSelectedStation(undefined)
                    setShowStationPicker(false)
                  }}
                  class={cn(
                    "w-full px-4 py-3 text-left text-sm border-b border-border/50 hover:bg-secondary/50",
                    !selectedStation && "text-primary font-medium"
                  )}
                >
                  全部驿站
                </view>
                
    <view v-for="(station, index) in stations" :key="index"> (
                  <view class="v0-btn"
                    key={{ station.id }}
                    @click={() => {
                      setSelectedStation(station.id)
                      setShowStationPicker(false)
                    }}
                    class={cn(
                      "w-full px-4 py-3 text-left text-sm border-b border-border/50 hover:bg-secondary/50",
                      selectedStation === station.id && "text-primary font-medium"
                    )}
                  >
                    <view class="font-medium">{{ station.name }}</view>
                    <view class="text-xs text-muted-foreground mt-0.5">{{ station.address }}</view>
                  </view>
                ))}
              </view>
            )}
    
            <!--   -->
            {showDatePicker && (
              <view class="absolute left-0 right-0 bg-background border-b border-border shadow-lg z-40">
                
    <view v-for="(option, index) in dateFilterOptions" :key="index"> (
                  <view class="v0-btn"
                    key={{ option.value }}
                    @click={() => {
                      setDateFilter(option.value)
                      setShowDatePicker(false)
                    }}
                    class={cn(
                      "w-full px-4 py-3 text-left text-sm border-b border-border/50 hover:bg-secondary/50",
                      dateFilter === option.value && "text-primary font-medium"
                    )}
                  >
                    {{ option.label }}
                  </view>
                ))}
              </view>
            )}
          </view>
    
          <!--   -->
          <view class="px-4 py-4">
            {loading ? (
              <view class="space-y-4">
                {[1, 2, 3].map(i => (
                  <Card key={i} class="p-4">
                    <view class="flex gap-3">
                      <Skeleton class="w-28 h-20 rounded-lg flex-shrink-0" />
                      <view class="flex-1 space-y-2">
                        <Skeleton class="h-5 w-3/4" />
                        <Skeleton class="h-4 w-1/2" />
                        <Skeleton class="h-4 w-2/3" />
                      </view>
                    </view>
                  </Card>
                ))}
              </view>
            ) : courses.length === 0 ? (
              <view class="flex flex-col items-center justify-center py-20 text-center">
                <view class="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-4">
                  <Calendar class="w-10 h-10 text-muted-foreground" />
                </view>
                <text class="text-muted-foreground mb-2">暂无课程</text>
                <text class="text-sm text-muted-foreground/70">
                  {keyword ? '没有找到匹配的课程' : '该时间段暂无线下课程安排'}
                </text>
              </view>
            ) : (
              <view class="space-y-4">
                
    <view v-for="(course, index) in courses" :key="index"> (
                  <Link key={course.id} href={`/offline/courses/${course.id}`}>
                    <Card class="overflow-hidden hover:shadow-md transition-shadow">
                      <view class="flex gap-3 p-3">
                        <!--   -->
                        <view class="relative w-28 h-20 flex-shrink-0">
                          <image
                            src={{ course.cover }}
                            alt={{ course.title }}
                            class="w-full h-full object-cover rounded-lg"
                          />
                          {course.price === 0 && (
                            <Badge class="absolute top-1 left-1 bg-green-500 text-white text-[10px] px-1.5">
                              免费
                            </Badge>
                          )}
                        </view>
    
                        <!--   -->
                        <view class="flex-1 min-w-0">
                          <view class="flex items-start justify-between gap-2 mb-1">
                            <text class="font-medium text-sm line-clamp-1">{{ course.title }}</text>
                            <Badge class={cn("text-[10px] px-1.5 flex-shrink-0", getCourseStatusColor(course.status))}>
                              {{ getCourseStatusLabel(course.status) }}
                            </Badge>
                          </view>
    
                          <!--   -->
                          <view class="flex items-center gap-1.5 mb-1.5">
                            <Avatar class="w-4 h-4">
                              <AvatarImage src={{ course.instructor.avatar }} />
                              <AvatarFallback class="text-[8px]">
                                {{ course.instructor.name[0] }}
                              </AvatarFallback>
                            </Avatar>
                            <text class="text-xs text-muted-foreground">
                              {{ course.instructor.name }}
                            </text>
                            {course.instructor.title && (
                              <text class="text-[10px] text-muted-foreground/70">
                                · {{ course.instructor.title }}
                              </text>
                            )}
                          </view>
    
                          <!--   -->
                          <view class="flex items-center gap-3 text-[11px] text-muted-foreground mb-1.5">
                            <text class="flex items-center gap-0.5">
                              <Clock class="w-3 h-3" />
                              {new Date(course.startTime).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}
                            </text>
                            <text class="flex items-center gap-0.5 truncate">
                              <MapPin class="w-3 h-3 flex-shrink-0" />
                              <text class="truncate">{{ course.stationName }}</text>
                            </text>
                          </view>
    
                          <!--   -->
                          <view class="flex items-center justify-between">
                            <view class="flex items-baseline gap-1">
                              {course.price > 0 ? (
                                
                                  <text class="text-primary font-semibold text-sm">
                                    ¥{{ course.price }}
                                  </text>
                                  {course.originalPrice && course.originalPrice > course.price && (
                                    <text class="text-[10px] text-muted-foreground line-through">
                                      ¥{{ course.originalPrice }}
                                    </text>
                                  )}
                                
                              ) : (
                                <text class="text-green-600 font-semibold text-sm">免费</text>
                              )}
                            </view>
                            <view class="flex items-center gap-0.5 text-[11px] text-muted-foreground">
                              <Users class="w-3 h-3" />
                              <text>{{ course.currentParticipants }}/{{ course.maxParticipants }}人</text>
                            </view>
                          </view>
                        </view>
                      </view>
    
                      <!--   -->
                      {course.tags && course.tags.length > 0 && (
                        <view class="flex items-center gap-1.5 px-3 pb-3">
                          {course.tags.slice(0, 3).map(tag => (
                            <Badge key={tag} variant="secondary" class="text-[10px] px-1.5 py-0">
                              {{ tag }}
                            </Badge>
                          ))}
                        </view>
                      )}
                    </Card>
                  </Link>
                ))}
              </view>
            )}
          </view>
    
          <!--   -->
          {(showStationPicker || showDatePicker) && (
            <view 
              class="fixed inset-0 z-30" 
              @click={() => {
                setShowStationPicker(false)
                setShowDatePicker(false)
              }} 
            />
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
const dateFilterOptions: { value: OfflineCourseListParams['dateFilter']; label: string }[] = [

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