<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">course</text>
      <text class="v0-route">V0: course/[id]</text>
    </view>
        <view class="min-h-screen bg-[#FAF8F5] pb-20 lg:pb-0">
          <!--   -->
          <view class="lg:flex lg:max-w-6xl lg:mx-auto lg:gap-6 lg:p-6">
            <!--   -->
            <view class="lg:flex-1 lg:min-w-0">
              <!--   -->
              <view class="lg:rounded-xl lg:overflow-hidden">
                <CourseCover 
                  images={{ mockCourse.images }} 
                  title={{ mockCourse.title }} 
                />
              </view>
    
              <!--   -->
              {!isPurchased && (
                <view class="px-4 py-2 lg:px-0 lg:mt-4">
                  <CountdownBanner 
                    endTime={{ new Date(Date.now() + 2 * 60 * 60 * 1000 + 35 * 60 * 1000) }} 
                    title="限时特惠"
                    discountAmount={{ mockCourse.originalPrice - mockCourse.currentPrice }}
                  />
                </view>
              )}
    
              <!--   -->
              <view class="lg:hidden">
                <CourseInfo
                  title={{ mockCourse.title }}
                  currentPrice={{ mockCourse.currentPrice }}
                  originalPrice={{ mockCourse.originalPrice }}
                  studentsCount={{ mockCourse.studentsCount }}
                  tags={{ mockCourse.tags }}
                />
              </view>
    
              <!--   -->
              <view class="lg:mt-4 lg:rounded-xl lg:overflow-hidden">
                <InstructorCard
                  name={{ mockCourse.instructor.name }}
                  avatar={{ mockCourse.instructor.avatar }}
                  title={{ mockCourse.instructor.title }}
                  description={{ mockCourse.instructor.description }}
                  coursesCount={{ mockCourse.instructor.coursesCount }}
                  studentsCount={{ mockCourse.instructor.studentsCount }}
                  isVerified={{ mockCourse.instructor.isVerified }}
                />
              </view>
    
              <!--   -->
              {!isPurchased && (
                <view class="px-4 py-2 lg:px-0 lg:mt-4">
                  <CouponClaimCard amount={{ 30 }} threshold={{ 199 }} />
                </view>
              )}
    
              <!--   -->
              <view class="lg:mt-4">
                <CourseDescription
                  content={{ mockCourse.description }}
                  highlights={{ mockCourse.highlights }}
                />
              </view>
    
              <!--   -->
              <view class="lg:mt-4">
                <CourseChapters
                  sections={{ mockCourse.sections }}
                  isPurchased={{ isPurchased }}
                  onPlayChapter={{ handlePlayChapter }}
                />
              </view>
    
              <!--   -->
              <view class="lg:mt-4 lg:mb-6">
                <CourseReviews
                  averageRating={{ mockCourse.averageRating }}
                  totalReviews={{ mockCourse.totalReviews }}
                  reviews={{ mockCourse.reviews }}
                />
              </view>
            </view>
    
            <!--   -->
            <view class="hidden lg:block lg:w-80 lg:flex-shrink-0">
              <view class="sticky top-6">
                <!--   -->
                <view class="bg-white rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-4 mb-4 border-0">
                  <text class="text-lg font-bold text-foreground leading-tight mb-3">
                    {{ mockCourse.title }}
                  </text>
                  <view class="flex flex-wrap gap-2 mb-4">
                    {mockCourse.tags.map((tag, index) => (
                      <text key={index} class="px-2 py-0.5 text-xs rounded bg-primary/10 text-primary">
                        {{ tag }}
                      </text>
                    ))}
                  </view>
                  
                  <!--   -->
                  <view class="flex items-baseline gap-2 mb-4">
                    <text class="text-3xl font-bold text-primary">
                      <text class="text-lg">¥</text>{{ mockCourse.currentPrice }}
                    </text>
                    <text class="text-sm text-muted-foreground line-through">
                      ¥{{ mockCourse.originalPrice }}
                    </text>
                    <text class="text-xs text-green-500 font-medium">
                      省¥{{ mockCourse.originalPrice - mockCourse.currentPrice }}
                    </text>
                  </view>
    
                  <!--   -->
                  <text class="text-sm text-muted-foreground mb-4">
                    {{ mockCourse.studentsCount.toLocaleString() }} 人已学习
                  </text>
    
                  <!--   -->
                  {isPurchased ? (
                    <view class="v0-btn"
                      @click={{ handleStartLearning }}
                      class="w-full py-3 rounded-lg bg-green-500 text-white font-semibold hover:bg-green-600 transition-colors"
                    >
                      继续学习
                    </view>
                  ) : (
                    <view class="space-y-3">
                      <view class="v0-btn"
                        @click={{ handleBuy }}
                        class="w-full py-3 rounded-lg bg-[#C41E3A] text-white font-semibold shadow-lg shadow-[#C41E3A]/20 hover:shadow-[#C41E3A]/30 hover:bg-[#A01830] transition-all"
                      >
                        立即购买
                      </view>
                      <view class="v0-btn"
                        @click={{ handleAddToCart }}
                        class="w-full py-3 rounded-lg bg-[#C9A96E]/20 text-[#C9A96E] font-semibold hover:bg-[#C9A96E]/30 transition-colors"
                      >
                        加入购物车
                      </view>
                    </view>
                  )}
    
                  <!--   -->
                  <view class="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-border text-xs text-muted-foreground">
                    <text>7天无理由</text>
                    <text>•</text>
                    <text>永久回看</text>
                    <text>•</text>
                    <text>品质保障</text>
                  </view>
                </view>
    
                <!--   -->
                <view class="flex items-center justify-center gap-4">
                  <view class="v0-btn"
                    @click={{ handleFavorite }}
                    class="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary/50 text-sm hover:bg-secondary transition-colors"
                  >
                    {isFavorited ? "已收藏" : "收藏"}
                  </view>
                  <view class="v0-btn"
                    @click={{ handleShare }}
                    class="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary/50 text-sm hover:bg-secondary transition-colors"
                  >
                    分享
                  </view>
                </view>
              </view>
            </view>
          </view>
    
          <!--   -->
          <view class="lg:hidden">
            <CourseBottomBar
              price={{ mockCourse.currentPrice }}
              originalPrice={{ mockCourse.originalPrice }}
              studentsCount={{ mockCourse.studentsCount }}
              isPurchased={{ isPurchased }}
              isFavorited={{ isFavorited }}
              cartCount={{ cartCount }}
              isUrgent={{ true }}
              onFavorite={{ handleFavorite }}
              onShare={{ handleShare }}
              onAddToCart={{ handleAddToCart }}
              onBuy={{ handleBuy }}
              onStartLearning={{ handleStartLearning }}
            />
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
const mockCourse = {

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