<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">learning</text>
      <text class="v0-route">V0: learning</text>
    </view>
        <view class="min-h-screen bg-background pb-6">
          <!--   -->
          <view class="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border safe-area-pt">
            <view class="flex items-center justify-between px-4 h-14">
              <BackButton fallbackPath="/profile" />
              <text class="font-semibold text-base text-foreground">学习进度</text>
              <view class="w-9" />
            </view>
          </view>
    
          <!--   -->
          <view class="px-4 py-4">
            <Card class="bg-gradient-to-br from-primary/10 via-accent/5 to-primary/10 border-primary/20 p-4">
              <!--   -->
              <view class="flex items-center justify-between mb-4">
                <view class="flex items-center gap-2">
                  <Flame class="w-5 h-5 text-orange-500" />
                  <text class="text-sm font-medium text-foreground">连续学习 {{ statsData.streak }} 天</text>
                </view>
                <Badge class="bg-orange-500/10 text-orange-600">坚持就是胜利</Badge>
              </view>
    
              <!--   -->
              <view class="flex justify-between mb-4">
                
    <view v-for="(day, index) in calendarData" :key="index"> (
                  <view key={index} class="flex flex-col items-center">
                    <text class="text-[10px] text-muted-foreground mb-1">{{ day.day }}</text>
                    <view class={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium",
                      day.isToday && "ring-2 ring-primary",
                      day.completed 
                        ? "bg-primary text-primary-foreground" 
                        : "bg-secondary text-muted-foreground"
                    )}>
                      {{ day.date }}
                    </view>
                    {day.minutes > 0 && (
                      <text class="text-[10px] text-muted-foreground mt-1">{{ day.minutes }}分</text>
                    )}
                  </view>
                ))}
              </view>
    
              <!--   -->
              <view>
                <view class="flex items-center justify-between text-xs mb-1">
                  <text class="text-muted-foreground flex items-center gap-1">
                    <Target class="w-3 h-3" /> 本周目标
                  </text>
                  <text class="text-foreground font-medium">
                    {{ formatTime(statsData.weeklyProgress) }} / {{ formatTime(statsData.weeklyTarget) }}
                  </text>
                </view>
                <view class="h-2 bg-secondary rounded-full overflow-hidden">
                  <view 
                    class="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all"
                    :style=" width: `${{ (statsData.weeklyProgress / statsData.weeklyTarget) * 100 }}%` }}
                  />
                </view>
              </view>
            </Card>
    
            <!--   -->
            <view class="grid grid-cols-3 gap-3 mt-4">
              <Card class="p-3 text-center">
                <Clock class="w-5 h-5 text-primary mx-auto mb-1" />
                <text class="text-lg font-bold text-foreground">{{ formatTime(statsData.totalMinutes) }}</text>
                <text class="text-[10px] text-muted-foreground">累计学习</text>
              </Card>
              <Card class="p-3 text-center">
                <BookOpen class="w-5 h-5 text-accent mx-auto mb-1" />
                <text class="text-lg font-bold text-foreground">{{ statsData.totalCourses }}</text>
                <text class="text-[10px] text-muted-foreground">学习课程</text>
              </Card>
              <Card class="p-3 text-center">
                <Trophy class="w-5 h-5 text-amber-500 mx-auto mb-1" />
                <text class="text-lg font-bold text-foreground">{{ statsData.completedCourses }}</text>
                <text class="text-[10px] text-muted-foreground">已完成</text>
              </Card>
            </view>
          </view>
    
          <!--   -->
          <view class="px-4 mb-4">
            <view class="flex bg-secondary rounded-xl p-1">
              <view class="v0-btn"
                @click={() => setActiveTab("learning")}
                class={cn(
                  "flex-1 py-2 text-sm font-medium rounded-lg transition-colors",
                  activeTab === "learning"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground"
                )}
              >
                正在学习 ({{ learningCourses.length }})
              </view>
              <view class="v0-btn"
                @click={() => setActiveTab("completed")}
                class={cn(
                  "flex-1 py-2 text-sm font-medium rounded-lg transition-colors",
                  activeTab === "completed"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground"
                )}
              >
                已完成 ({{ completedCourses.length }})
              </view>
            </view>
          </view>
    
          <!--   -->
          <view class="px-4 space-y-3">
            {activeTab === "learning" ? (
              learningCourses.map(course => (
                <Link key={{ course.id }} href={`/learn/${course.id}`}>
                  <Card class="p-4 hover:bg-secondary/50 transition-colors">
                    <view class="flex gap-3">
                      <!--   -->
                      <view class="w-20 h-20 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center flex-shrink-0">
                        <Play class="w-8 h-8 text-primary/60" />
                      </view>
    
                      <!--   -->
                      <view class="flex-1 min-w-0">
                        <text class="font-medium text-sm text-foreground line-clamp-1 mb-1">{{ course.title }}</text>
                        <text class="text-xs text-muted-foreground mb-2">{{ course.instructor }}</text>
                        
                        <!--   -->
                        <view class="mb-2">
                          <view class="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                            <text>已学 {{ course.completedChapters }}/{{ course.totalChapters }} 章</text>
                            <text>{{ course.progress }}%</text>
                          </view>
                          <view class="h-1.5 bg-secondary rounded-full overflow-hidden">
                            <view 
                              class="h-full bg-primary rounded-full transition-all"
                              :style=" width: `${{ course.progress }}%` }}
                            />
                          </view>
                        </view>
    
                        <view class="flex items-center justify-between">
                          <text class="text-[10px] text-muted-foreground">
                            上次学到：{{ course.lastChapter }}
                          </text>
                          <text class="text-[10px] text-muted-foreground">{{ course.lastTime }}</text>
                        </view>
                      </view>
                    </view>
    
                    <!--   -->
                    <view class="v0-btn" class="w-full mt-3 py-2 bg-primary/10 text-primary text-sm font-medium rounded-lg hover:bg-primary/20 transition-colors">
                      继续学习
                    </view>
                  </Card>
                </Link>
              ))
            ) : (
              completedCourses.map(course => (
                <Link key={{ course.id }} href={`/course/${course.id}`}>
                  <Card class="p-4 hover:bg-secondary/50 transition-colors">
                    <view class="flex gap-3">
                      <!--   -->
                      <view class="w-16 h-16 rounded-lg bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center flex-shrink-0 relative">
                        <Trophy class="w-6 h-6 text-green-600" />
                        {course.certificate && (
                          <Award class="w-4 h-4 text-amber-500 absolute -top-1 -right-1" />
                        )}
                      </view>
    
                      <!--   -->
                      <view class="flex-1 min-w-0">
                        <view class="flex items-center gap-2 mb-1">
                          <text class="font-medium text-sm text-foreground line-clamp-1">{{ course.title }}</text>
                          <Badge class="bg-green-500/10 text-green-600 text-[10px] px-1.5 py-0">已完成</Badge>
                        </view>
                        <text class="text-xs text-muted-foreground mb-2">{{ course.instructor }}</text>
                        
                        <view class="flex items-center justify-between">
                          <view class="flex items-center gap-0.5">
                            {[...Array(5)].map((_, i) => (
                              <text 
                                key={i} 
                                class={cn(
                                  "text-xs",
                                  i < course.rating ? "text-amber-400" : "text-muted-foreground/30"
                                )}
                              >
                                ★
                              </text>
                            ))}
                            <text class="text-[10px] text-muted-foreground ml-1">我的评分</text>
                          </view>
                          <text class="text-[10px] text-muted-foreground">完成于 {{ course.completedDate }}</text>
                        </view>
                      </view>
    
                      <ChevronRight class="w-4 h-4 text-muted-foreground self-center" />
                    </view>
    
                    {course.certificate && (
                      <view class="v0-btn" class="w-full mt-3 py-2 bg-amber-500/10 text-amber-600 text-sm font-medium rounded-lg hover:bg-amber-500/20 transition-colors flex items-center justify-center gap-2">
                        <Award class="w-4 h-4" />
                        查看结业证书
                      </view>
                    )}
                  </Card>
                </Link>
              ))
            )}
          </view>
    
          <!--   -->
          <view class="px-4 mt-6">
            <view class="flex items-center gap-2 mb-3">
              <Sparkles class="w-5 h-5 text-primary" />
              <text class="font-semibold text-base text-foreground">我的学习路径</text>
            </view>
            <LearningPath {...presetPaths.bazi} />
          </view>
    
          <!--   -->
          <view class="px-4 mt-6 pb-6">
            <AchievementBadges badges={{ presetBadges }} />
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
const statsData = {
const learningCourses = [
const completedCourses = [
const calendarData = [

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