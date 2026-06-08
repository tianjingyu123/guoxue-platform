<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">研究院</text>
      <text class="v0-route">V0: institute/teacher-pool</text>
    </view>
        <view class="min-h-screen bg-background">
          <!--   -->
          <view class="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
            <view class="flex items-center justify-between px-4 py-3">
              <view class="flex items-center gap-3">
                <Link href="/institute" class="p-1">
                  <ArrowLeft class="w-5 h-5" />
                </Link>
                <text class="text-lg font-semibold">线下老师人才库</text>
              </view>
              <Button 
                variant="ghost" 
                size="sm"
                @click={() => setShowFilter(!showFilter)}
                class={cn(showFilter && "text-primary")}
              >
                <Filter class="w-4 h-4 mr-1" />
                筛选
              </Button>
            </view>
          </view>
    
          <!--   -->
          <view class="px-4 py-3 border-b border-border">
            <view class="relative">
              <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="搜索老师姓名或擅长领域"
                value={{ searchKeyword }}
                @change={(e) => setSearchKeyword(e.target.value)}
                class="pl-9 bg-secondary/30 border-0"
              />
            </view>
          </view>
    
          <!--   -->
          {showFilter && (
            <view class="px-4 py-3 border-b border-border space-y-3 bg-secondary/20">
              <view>
                <text class="text-xs text-muted-foreground mb-2">擅长领域</text>
                <view class="flex flex-wrap gap-2">
                  
    <view v-for="(s, index) in specialties" :key="index"> (
                    <Button
                      key={s}
                      variant={selectedSpecialty === s ? "default" : "outline"}
                      size="sm"
                      @click={() => setSelectedSpecialty(s)}
                      class="text-xs h-7 rounded-full"
                    >
                      {{ s }}
                    </Button>
                  ))}
                </view>
              </view>
              <view>
                <text class="text-xs text-muted-foreground mb-2">所在城市</text>
                <view class="flex flex-wrap gap-2">
                  
    <view v-for="(c, index) in cities" :key="index"> (
                    <Button
                      key={c}
                      variant={selectedCity === c ? "default" : "outline"}
                      size="sm"
                      @click={() => setSelectedCity(c)}
                      class="text-xs h-7 rounded-full"
                    >
                      {{ c }}
                    </Button>
                  ))}
                </view>
              </view>
            </view>
          )}
    
          <!--   -->
          <view class="px-4 py-2 flex items-center justify-between text-xs text-muted-foreground">
            <text>共 {{ filteredTeachers.length }} 位老师</text>
            <text>{filteredTeachers.filter(t => t.available).length} 位可约</text>
          </view>
    
          <!--   -->
          <view class="px-4 py-2 space-y-3">
            
    <view v-for="(teacher, index) in filteredTeachers" :key="index"> {
              const level = levelConfig[teacher.level]
              return (
                <Link href={`/institute/teachers/${teacher.id}`} key={{ teacher.id }}>
                  <Card class="p-3 hover:bg-secondary/30 transition-colors">
                    <view class="flex gap-3">
                      <!--   -->
                      <view class="relative flex-shrink-0">
                        <view class="w-16 h-16 rounded-xl bg-gradient-to-br from-gold/20 to-gold/20 flex items-center justify-center text-xl font-bold text-gold">
                          {{ teacher.name.slice(0, 1) }}
                        </view>
                        <view class={cn(
                          "absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded text-[10px] font-medium",
                          level.bgColor, level.color
                        )}>
                          {{ level.label.slice(0, 2) }}
                        </view>
                      </view>
                      
                      <!--   -->
                      <view class="flex-1 min-w-0">
                        <view class="flex items-center gap-2">
                          <text class="font-medium text-foreground">{{ teacher.name }}</text>
                          <BadgeCheck class="w-4 h-4 text-info" />
                          <view class="flex items-center gap-0.5 text-amber-500">
                            <Star class="w-3 h-3 fill-current" />
                            <text class="text-xs">{{ teacher.rating }}</text>
                          </view>
                        </view>
                        
                        <view class="flex flex-wrap gap-1 mt-1">
                          {teacher.specialty.map(s => (
                            <Badge key={s} variant="secondary" class="text-[10px] px-1.5 py-0">
                              {{ s }}
                            </Badge>
                          ))}
                        </view>
                        
                        <view class="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                          <text class="flex items-center gap-1">
                            <MapPin class="w-3 h-3" />
                            {{ teacher.location }}
                          </text>
                          <text class="flex items-center gap-1">
                            <Video class="w-3 h-3" />
                            授课{{ teacher.coursesCount }}次
                          </text>
                          <text class="flex items-center gap-1">
                            <Users class="w-3 h-3" />
                            {{ teacher.studentsCount }}学员
                          </text>
                        </view>
                        
                        <view class="flex items-center justify-between mt-2">
                          <text class="text-xs">
                            <text class="text-muted-foreground">课时费 </text>
                            <text class="text-primary font-medium">¥{{ teacher.price.min }}-{{ teacher.price.max }}</text>
                          </text>
                          {teacher.available ? (
                            <Badge class="text-[10px] bg-success/10 text-success">可预约</Badge>
                          ) : (
                            <Badge class="text-[10px] bg-muted text-muted-foreground">
                              {{ teacher.nextAvailable }}可约
                            </Badge>
                          )}
                        </view>
                      </view>
                      
                      <ChevronRight class="w-4 h-4 text-muted-foreground self-center flex-shrink-0" />
                    </view>
                  </Card>
                </Link>
              )
            })}
          </view>
    
          <!--   -->
          <view class="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border">
            <Link href="/institute/teacher-demand">
              <Button class="w-full" variant="outline">
                <Calendar class="w-4 h-4 mr-2" />
                我是驿站，发布课程需求
              </Button>
            </Link>
          </view>
    
          <view class="h-20" />
        </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'

const loading = ref(true)
const error = ref<string | null>(null)

// V0 原始数据
const levelConfig: Record<TeacherLevel, { label: string; color: string; bgColor: string }> = {
const mockTeachers: OfflineTeacher[] = [
const specialties = ["全部", "八字命理", "紫微斗数", "风水堪舆", "易经占卜", "奇门遁甲", "面相手相"]
const cities = ["全部", "北京", "上海", "广州", "成都", "南京", "西安"]

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