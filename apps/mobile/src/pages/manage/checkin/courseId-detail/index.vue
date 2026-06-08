<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">管理</text>
      <text class="v0-route">V0: manage/checkin/[courseId]</text>
    </view>
        <view class="min-h-screen bg-background pb-6">
          <!--   -->
          <view class="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border safe-area-pt">
            <view class="flex items-center justify-between px-4 h-14">
              <BackButton fallbackPath="/manage/station" />
              <text class="font-semibold text-base text-foreground">签到核销</text>
              <view class="w-9" />
            </view>
          </view>
    
          <!--   -->
          <view class="px-4 py-4">
            <Card class="p-4 bg-gradient-to-br from-primary/10 via-accent/5 to-background border-primary/20">
              <view class="flex items-start justify-between mb-3">
                <view>
                  <text class="font-semibold text-base text-foreground">{{ courseData.title }}</text>
                  <text class="text-xs text-muted-foreground mt-1">{{ courseData.location }}</text>
                </view>
                <Badge variant="secondary" class="bg-accent/20 text-accent border-0">
                  进行中
                </Badge>
              </view>
              <view class="flex items-center gap-4 text-sm">
                <view class="flex items-center gap-1.5 text-muted-foreground">
                  <Clock class="w-4 h-4" />
                  <text>{{ courseData.time }}</text>
                </view>
                <view class="flex items-center gap-1.5 text-muted-foreground">
                  <Users class="w-4 h-4" />
                  <text>
                    <text class="text-accent font-medium">{{ checkedInStudents.length }}</text>
                    /{{ courseData.totalEnrolled }} 已签到
                  </text>
                </view>
              </view>
              <!--   -->
              <view class="mt-3 h-2 bg-secondary rounded-full overflow-hidden">
                <view 
                  class="h-full bg-accent rounded-full transition-all duration-500"
                  :style=" width: `${{ (checkedInStudents.length / courseData.totalEnrolled) * 100 }}%` }}
                />
              </view>
            </Card>
          </view>
    
          <!--   -->
          <view class="px-4 pb-4">
            <Card class="p-6 text-center">
              <view 
                class={cn(
                  "relative w-48 h-48 mx-auto rounded-2xl border-2 border-dashed flex items-center justify-center mb-4 transition-all",
                  isScanning ? "border-accent bg-accent/5" : "border-border bg-secondary/30"
                )}
                @click={{ handleStartScan }}
              >
                {isScanning ? (
                  <view class="flex flex-col items-center">
                    <view class="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin mb-3" />
                    <text class="text-sm text-accent">扫描中...</text>
                  </view>
                ) : (
                  <view class="flex flex-col items-center cursor-pointer">
                    <view class="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
                      <Camera class="w-10 h-10 text-primary" />
                    </view>
                    <text class="text-sm text-muted-foreground">点击扫描学员二维码</text>
                  </view>
                )}
                <!--   -->
                <view class="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-accent rounded-tl-lg" />
                <view class="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-accent rounded-tr-lg" />
                <view class="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-accent rounded-bl-lg" />
                <view class="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-accent rounded-br-lg" />
              </view>
    
              <!--   -->
              <view class="v0-btn" 
                @click={() => setShowManualInput(!showManualInput)}
                class="flex items-center gap-2 mx-auto text-sm text-primary hover:underline"
              >
                <Keyboard class="w-4 h-4" />
                手动签到
              </view>
    
              <!--   -->
              {showManualInput && (
                <view class="mt-4 text-left">
                  <view class="relative">
                    <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      value={{ searchQuery }}
                      @change={(e) => handleSearch(e.target.value)}
                      placeholder="输入学员手机号或昵称搜索"
                      class="w-full h-10 pl-10 pr-4 rounded-lg border border-border bg-secondary/50 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </view>
                  <!--   -->
                  {searchResults.length > 0 && (
                    <view class="mt-2 space-y-2">
                      
    <view v-for="(student, index) in searchResults" :key="index"> (
                        <Card 
                          key={student.id}
                          class="flex items-center justify-between p-3 cursor-pointer hover:bg-secondary/50"
                          @click={() => handleManualCheckin(student)}
                        >
                          <view class="flex items-center gap-3">
                            <Avatar class="w-10 h-10">
                              <AvatarImage src={{ student.avatar }} alt={{ student.name }} />
                              <AvatarFallback class="bg-secondary text-foreground">
                                {{ student.name[0] }}
                              </AvatarFallback>
                            </Avatar>
                            <view>
                              <text class="text-sm font-medium text-foreground">{{ student.name }}</text>
                              <text class="text-xs text-muted-foreground">{{ student.phone }}</text>
                            </view>
                          </view>
                          <view class="v0-btn" class="px-3 py-1.5 bg-primary text-primary-foreground text-xs rounded-full">
                            签到
                          </view>
                        </Card>
                      ))}
                    </view>
                  )}
                  {searchQuery.length >= 2 && searchResults.length === 0 && (
                    <text class="mt-4 text-center text-sm text-muted-foreground">未找到相关学员</text>
                  )}
                </view>
              )}
            </Card>
          </view>
    
          <!--   -->
          <view class="px-4 space-y-4">
            <!--   -->
            <Card class="overflow-hidden">
              <view class="v0-btn" 
                @click={() => setShowNotCheckedIn(!showNotCheckedIn)}
                class="flex items-center justify-between w-full p-4 hover:bg-secondary/30 transition-colors"
              >
                <view class="flex items-center gap-2">
                  <Badge variant="outline" class="bg-orange-500/10 text-orange-500 border-orange-500/30">
                    未签到
                  </Badge>
                  <text class="text-sm text-muted-foreground">{{ notCheckedInStudents.length }}人</text>
                </view>
                {showNotCheckedIn ? (
                  <ChevronUp class="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown class="w-4 h-4 text-muted-foreground" />
                )}
              </view>
              {showNotCheckedIn && notCheckedInStudents.length > 0 && (
                <view class="border-t border-border divide-y divide-border">
                  
    <view v-for="(student, index) in notCheckedInStudents" :key="index"> (
                    <view key={student.id} class="flex items-center justify-between px-4 py-3">
                      <view class="flex items-center gap-3">
                        <Avatar class="w-10 h-10">
                          <AvatarImage src={{ student.avatar }} alt={{ student.name }} />
                          <AvatarFallback class="bg-secondary text-foreground">
                            {{ student.name[0] }}
                          </AvatarFallback>
                        </Avatar>
                        <view>
                          <text class="text-sm font-medium text-foreground">{{ student.name }}</text>
                          <text class="text-xs text-muted-foreground">{{ student.phone }}</text>
                        </view>
                      </view>
                      <view class="v0-btn" 
                        @click={() => handleManualCheckin(student)}
                        class="px-3 py-1.5 border border-primary text-primary text-xs rounded-full hover:bg-primary/10"
                      >
                        手动签到
                      </view>
                    </view>
                  ))}
                </view>
              )}
            </Card>
    
            <!--   -->
            <Card class="overflow-hidden">
              <view class="v0-btn" 
                @click={() => setShowCheckedIn(!showCheckedIn)}
                class="flex items-center justify-between w-full p-4 hover:bg-secondary/30 transition-colors"
              >
                <view class="flex items-center gap-2">
                  <Badge variant="outline" class="bg-green-500/10 text-green-500 border-green-500/30">
                    已签到
                  </Badge>
                  <text class="text-sm text-muted-foreground">{{ checkedInStudents.length }}人</text>
                </view>
                {showCheckedIn ? (
                  <ChevronUp class="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown class="w-4 h-4 text-muted-foreground" />
                )}
              </view>
              {showCheckedIn && checkedInStudents.length > 0 && (
                <view class="border-t border-border divide-y divide-border">
                  
    <view v-for="(student, index) in checkedInStudents" :key="index"> (
                    <view key={student.id} class="flex items-center justify-between px-4 py-3">
                      <view class="flex items-center gap-3">
                        <Avatar class="w-10 h-10">
                          <AvatarImage src={{ student.avatar }} alt={{ student.name }} />
                          <AvatarFallback class="bg-secondary text-foreground">
                            {{ student.name[0] }}
                          </AvatarFallback>
                        </Avatar>
                        <view>
                          <text class="text-sm font-medium text-foreground">{{ student.name }}</text>
                          <text class="text-xs text-muted-foreground">{{ student.phone }}</text>
                        </view>
                      </view>
                      <view class="flex items-center gap-2 text-xs text-green-500">
                        <CheckCircle2 class="w-4 h-4" />
                        <text>{{ student.checkTime }}</text>
                      </view>
                    </view>
                  ))}
                </view>
              )}
            </Card>
          </view>
    
          <!--   -->
          {showConfirmModal && scannedStudent && (
            <view class="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
              <view class="w-[85%] max-w-sm bg-card rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <view class="p-6 text-center">
                  <Avatar class="w-20 h-20 mx-auto mb-4 ring-4 ring-accent/30">
                    <AvatarImage src={{ scannedStudent.avatar }} alt={{ scannedStudent.name }} />
                    <AvatarFallback class="bg-secondary text-foreground text-2xl">
                      {{ scannedStudent.name[0] }}
                    </AvatarFallback>
                  </Avatar>
                  <text class="text-lg font-semibold text-foreground">{{ scannedStudent.name }}</text>
                  <text class="text-sm text-muted-foreground mt-1">{{ scannedStudent.phone }}</text>
                  <text class="text-xs text-muted-foreground mt-2">报名时间：{{ scannedStudent.enrollTime }}</text>
                </view>
                <view class="flex border-t border-border">
                  <view class="v0-btn" 
                    @click={() => setShowConfirmModal(false)}
                    class="flex-1 py-4 text-sm text-muted-foreground hover:bg-secondary/50 transition-colors"
                  >
                    取消
                  </view>
                  <view class="v0-btn" 
                    @click={{ handleConfirmCheckin }}
                    class="flex-1 py-4 text-sm font-medium text-accent hover:bg-accent/10 transition-colors border-l border-border"
                  >
                    确认签到
                  </view>
                </view>
              </view>
            </view>
          )}
    
          <!--   -->
          {showSuccessAnimation && (
            <view class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 pointer-events-none">
              <view class="w-32 h-32 rounded-full bg-green-500 flex items-center justify-center animate-in zoom-in-50 duration-300">
                <Check class="w-16 h-16 text-white" strokeWidth={{ 3 }} />
              </view>
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
const courseData = {
const studentsData = [

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