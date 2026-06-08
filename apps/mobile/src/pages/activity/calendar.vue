<template>
  <view class="page v0-page" data-v0-route="activity/calendar">
        <view class="min-h-screen bg-background">
          <!--   -->
          <view class="sticky top-0 z-10 bg-background border-b border-border">
            <view class="flex items-center justify-between px-4 h-14">
              <Link href="/discover" class="p-2 -ml-2">
                <ArrowLeft class="w-5 h-5" />
              </Link>
              <text class="h1" class="font-semibold">活动日历</text>
              <view class="w-9" />
            </view>
          </view>
    
          <!--   -->
          <view class="flex items-center justify-between px-4 py-3 bg-card border-b border-border">
            <Button variant="ghost" size="icon" @click={() => changeMonth(-1)}>
              <ChevronLeft class="w-5 h-5" />
            </Button>
            <view class="flex items-center gap-2">
              <CalendarIcon class="w-4 h-4 text-primary" />
              <text class="font-semibold text-lg">{{ year }}年{{ month }}月</text>
            </view>
            <Button variant="ghost" size="icon" @click={() => changeMonth(1)}>
              <ChevronRight class="w-5 h-5" />
            </Button>
          </view>
    
          <!--   -->
          <view class="flex items-center justify-center gap-3 px-4 py-2 bg-card border-b border-border">
            {(['flash_sale', 'group_buy', 'live', 'course'] []).map(type => (
              <view key={type} class="flex items-center gap-1">
                <view 
                  class="w-2 h-2 rounded-full"
                  :style="{ backgroundColor: getEventTypeColor(type) }}
                />
                <text class="text-xs text-muted-foreground">{{ getEventTypeLabel(type) }}</text>
              </view>
            ))}
          </view>
    
          <DataState
            isLoading={{ loading }}
            error={{ error }}
            isEmpty={{ false }}
            onRetry={{ loadCalendarData }}
          >
            <!--   -->
            <view class="grid grid-cols-7 bg-card">
              <view v-for="day in WEEKDAYS" :key="day.id || index">
                <view key={day} class="text-center py-2 text-sm text-muted-foreground font-medium">
                  {{ day }}
                </view>
              ))}
            </view>
    
            <!--   -->
            <view class="grid grid-cols-7 bg-card border-b border-border">
              {{ calendarDays.map(({ date, day, isCurrentMonth, marker }}) => (
                <view class="v0-btn"
                  key={{ date }}
                  @click={() => handleSelectDate(date, marker)}
                  class="v0-class"
                >
                  <text class="v0-class">
                    {{ day }}
                  </text>
                  
                  <!--   -->
                  {{ marker && (
                    <view class="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                      {marker.hasFlashSale && (
                        <view class="w-1.5 h-1.5 rounded-full" :style="{ backgroundColor: getEventTypeColor('flash_sale')  }} />
                      )}
                      {{ marker.hasGroupBuy && (
                        <view class="w-1.5 h-1.5 rounded-full" :style="{ backgroundColor: getEventTypeColor('group_buy')  }} />
                      )}
                      {{ marker.hasLive && (
                        <view class="w-1.5 h-1.5 rounded-full" :style="{ backgroundColor: getEventTypeColor('live')  }} />
                      )}
                      {{ marker.hasCourse && (
                        <view class="w-1.5 h-1.5 rounded-full" :style="{ backgroundColor: getEventTypeColor('course')  }} />
                      )}
                    </view>
                  )}
                </view>
              ))}
            </view>
    
            <!--   -->
            <view class="p-4">
              {{ selectedDate ? (
                
                  <text class="h2" class="text-sm font-medium text-muted-foreground mb-3">
                    {selectedDate.replace(/-/g, '/') }} 的活动
                  </text>
                  {selectedEvents.length > 0 ? (
                    <view class="space-y-3">
                      <view v-for="event in selectedEvents" :key="event.id || index">{
                        const Icon = EVENT_TYPE_ICONS[event.type]
                        const color = getEventTypeColor(event.type)
                        return (
                          <Link
                            key={event.id}
                            href={{ getEventLink(event) }}
                            class="flex items-center gap-3 p-3 bg-card rounded-lg border border-border"
                          >
                            <view 
                              class="w-10 h-10 rounded-lg flex items-center justify-center"
                              :style="{ backgroundColor: `${color}20` }}
                            >
                              <Icon class="w-5 h-5" :style="{{ color  }} />
                            </view>
                            <view class="flex-1 min-w-0">
                              <view class="flex items-center gap-2">
                                <text class="font-medium truncate">{{ event.title }}</text>
                                <Badge 
                                  variant={{ event.status === 'ongoing' ? 'default' : 'secondary' }}
                                  class="shrink-0 text-xs"
                                >
                                  {{ getActivityStatusText(event.status) }}
                                </Badge>
                              </view>
                              <view class="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                <text>{{ event.startTime.split(' ')[1] }} - {{ event.endTime.split(' ')[1] }}</text>
                                {{ event.extra?.productCount && (
                                  <text>| {event.extra.productCount }}件商品</text>
                                )}
                                {{ event.extra?.hostName && (
                                  <text>| {event.extra.hostName }}</text>
                                )}
                              </view>
                            </view>
                            <ChevronRight class="w-4 h-4 text-muted-foreground shrink-0" />
                          </Link>
                        )
                      })}
                    </view>
                  ) : (
                    <view class="text-center py-8 text-muted-foreground">
                      <CalendarIcon class="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <text>该日期暂无活动</text>
                    </view>
                  )}
                
              ) : (
                <view class="text-center py-8 text-muted-foreground">
                  <text>点击日期查看活动详情</text>
                </view>
              )}
            </view>
          </DataState>
        </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onPullDownRefresh, onReachBottom } from '@dcloudio/uni-app'

const loading = ref(true)
const error = ref<string | null>(null)
const isEmpty = ref(false)

async function fetchData() {
  loading.value = true
  error.value = null
  try {
    // TODO: 集成真实 API - V0 路由: activity/calendar
    loading.value = false
  } catch (e: any) {
    error.value = e.message || '加载失败'
    loading.value = false
  }
}

onMounted(() => { fetchData() })
onPullDownRefresh(() => { fetchData().finally(() => uni.stopPullDownRefresh()) })
</script>

<style scoped>
.page {
  background: #FAF8F5;
  min-height: 100vh;
}

.v0-page {
  padding: 24rpx;
}

/* 按钮样式 */
.v0-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 16rpx 32rpx;
  border-radius: 12rpx;
  background: #C41E3A;
  color: #FFFFFF;
  font-size: 28rpx;
  font-weight: 500;
}

/* 列表项 */
.v0-li {
  padding: 24rpx;
  border-bottom: 1px solid #E8E0D5;
}

/* 分隔线 */
.hr {
  height: 1px;
  background: #E8E0D5;
  margin: 24rpx 0;
}
</style>