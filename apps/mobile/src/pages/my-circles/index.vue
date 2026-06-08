<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">my-circles</text>
      <text class="v0-route">V0: my-circles</text>
    </view>
        <view class="min-h-screen bg-[#FAF8F5] pb-20">
          <!--   -->
          <view class="sticky top-0 z-40 bg-white/95 backdrop-blur-md shadow-sm">
            <view class="flex items-center justify-between px-4 py-3">
              <view class="v0-btn" @click={() => router.back()} class="p-1">
                <ArrowLeft class="w-5 h-5 text-[#2C2C2C]" />
              </view>
              <text class="text-[17px] font-semibold text-[#2C2C2C]">我的圈子</text>
              <Link href="/circles" class="text-[13px] text-[#C41E3A]">发现更多</Link>
            </view>
          </view>
    
          <!--   -->
          <view class="px-4 pt-4">
            <view class="bg-gradient-to-br from-[#C41E3A] to-[#A01530] rounded-2xl p-4 text-white">
              <view class="flex items-center justify-between mb-4">
                <text class="font-medium">我的圈子数据</text>
                <Link href="/circles/stats" class="text-[12px] text-white/70 flex items-center">
                  详情 <ChevronRight class="w-4 h-4" />
                </Link>
              </view>
              <view class="grid grid-cols-4 gap-2 text-center">
                <view>
                  <view class="text-[22px] font-bold">{{ stats.totalCircles }}</view>
                  <view class="text-[11px] text-white/70">已加入</view>
                </view>
                <view>
                  <view class="text-[22px] font-bold">{{ stats.totalPosts }}</view>
                  <view class="text-[11px] text-white/70">发帖数</view>
                </view>
                <view>
                  <view class="text-[22px] font-bold">{stats.totalLikes > 1000 ? `${(stats.totalLikes/1000).toFixed(1)}k` : stats.totalLikes}</view>
                  <view class="text-[11px] text-white/70">获赞数</view>
                </view>
                <view>
                  <view class="text-[22px] font-bold">{{ stats.totalExp }}</view>
                  <view class="text-[11px] text-white/70">总经验</view>
                </view>
              </view>
              <!--   -->
              <view class="mt-4 pt-3 border-t border-white/20 flex items-center justify-around text-center">
                <view>
                  <view class="flex items-center justify-center gap-1">
                    <Crown class="w-4 h-4 text-yellow-300" />
                    <text class="font-medium">{{ stats.asOwner }}</text>
                  </view>
                  <view class="text-[10px] text-white/60">圈主</view>
                </view>
                <view>
                  <view class="flex items-center justify-center gap-1">
                    <Shield class="w-4 h-4 text-blue-300" />
                    <text class="font-medium">{{ stats.asAdmin }}</text>
                  </view>
                  <view class="text-[10px] text-white/60">管理员</view>
                </view>
                <view>
                  <view class="flex items-center justify-center gap-1">
                    <User class="w-4 h-4 text-green-300" />
                    <text class="font-medium">{{ stats.asMember }}</text>
                  </view>
                  <view class="text-[10px] text-white/60">成员</view>
                </view>
              </view>
            </view>
          </view>
    
          <!--   -->
          <view class="px-4 pt-4">
            <view class="flex items-center gap-3 mb-3">
              <view class="flex-1 relative">
                <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#999]" />
                <input
                  type="text"
                  placeholder="搜索圈子"
                  value={{ searchQuery }}
                  @change={(e) => setSearchQuery(e.target.value)}
                  class="w-full h-9 pl-9 pr-4 bg-white rounded-full border border-[#E8E3DB] text-[13px] focus:outline-none focus:border-[#C41E3A]/50"
                />
              </view>
            </view>
            
            <!--   -->
            <view class="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
              {[
                { id: "all", label: "全部", count: stats.totalCircles },
                { id: "owner", label: "我创建的", count: stats.asOwner },
                { id: "admin", label: "我管理的", count: stats.asAdmin },
                { id: "member", label: "我加入的", count: stats.asMember },
              ].map(tab => (
                <view class="v0-btn"
                  key={{ tab.id }}
                  @click={() => setActiveFilter(tab.id as typeof activeFilter)}
                  class={cn(
                    "flex-shrink-0 px-3 py-1.5 rounded-full text-[12px] font-medium transition-all flex items-center gap-1",
                    activeFilter === tab.id
                      ? "bg-[#C41E3A] text-white"
                      : "bg-white text-[#666] border border-[#E8E3DB]"
                  )}
                >
                  {{ tab.label }}
                  <text class={cn(
                    "text-[10px] px-1.5 rounded-full",
                    activeFilter === tab.id ? "bg-white/20" : "bg-[#F5F0E8]"
                  )}>
                    {{ tab.count }}
                  </text>
                </view>
              ))}
            </view>
          </view>
    
          <!--   -->
          <view class="px-4 pt-2 space-y-3">
            {filteredCircles.length === 0 ? (
              <view class="flex flex-col items-center justify-center py-16">
                <view class="w-16 h-16 rounded-full bg-[#F5F0E8] flex items-center justify-center mb-4">
                  <Users class="w-8 h-8 text-[#999]" />
                </view>
                <text class="text-[#999] text-[14px] mb-2">暂无圈子</text>
                <Link href="/circles" class="text-[#C41E3A] text-[13px]">
                  去发现圈子
                </Link>
              </view>
            ) : (
              filteredCircles.map(circle => {{ const RoleIcon = roleConfig[circle.role as keyof typeof roleConfig].icon
                const roleInfo = roleConfig[circle.role as keyof typeof roleConfig]
                
                return (
                  <Link key={circle.id }} href={`/circles/${circle.id}`}>
                    <view class="bg-white rounded-xl p-4 shadow-sm active:bg-[#F9F6F2] transition-colors">
                      <view class="flex items-start gap-3">
                        <!--   -->
                        <view class="relative">
                          <image 
                            src={{ circle.cover }} 
                            alt={{ circle.name }} 
                            class="w-14 h-14 rounded-xl object-cover"
                          />
                          {circle.unreadCount > 0 && (
                            <view class="absolute -top-1 -right-1 w-5 h-5 bg-[#C41E3A] rounded-full flex items-center justify-center">
                              <text class="text-[10px] text-white font-medium">
                                {circle.unreadCount > 99 ? '99+' : circle.unreadCount}
                              </text>
                            </view>
                          )}
                        </view>
                        
                        <!--   -->
                        <view class="flex-1 min-w-0">
                          <view class="flex items-center gap-2">
                            <text class="font-medium text-[15px] text-[#2C2C2C] truncate">{{ circle.name }}</text>
                            <text class={cn(
                              "text-[10px] px-1.5 py-0.5 rounded flex items-center gap-0.5",
                              roleInfo.bgColor, roleInfo.color
                            )}>
                              <RoleIcon class="w-3 h-3" />
                              {{ roleInfo.label }}
                            </text>
                          </view>
                          
                          <view class="flex items-center gap-3 mt-1 text-[12px] text-[#999]">
                            <text class="flex items-center gap-1">
                              <Users class="w-3.5 h-3.5" />
                              {{ circle.memberCount }}人
                            </text>
                            {circle.todayActive > 0 && (
                              <text class="flex items-center gap-1 text-[#FF6B35]">
                                <Flame class="w-3.5 h-3.5" />
                                今日{{ circle.todayActive }}动态
                              </text>
                            )}
                          </view>
                          
                          <text class="text-[12px] text-[#666] mt-1.5 line-clamp-1">{{ circle.latestPost }}</text>
                          
                          <!--   -->
                          <view class="flex items-center gap-2 mt-2">
                            <text class="text-[10px] px-1.5 py-0.5 bg-[#C41E3A]/10 text-[#C41E3A] rounded">
                              Lv.{{ circle.level }}
                            </text>
                            <view class="flex-1 h-1.5 bg-[#F5F0E8] rounded-full overflow-hidden">
                              <view 
                                class="h-full bg-gradient-to-r from-[#C41E3A] to-[#FF6B35] rounded-full"
                                :style=" width: `${{ (circle.exp % 500) / 5 }}%` }}
                              />
                            </view>
                            <text class="text-[10px] text-[#999]">{{ circle.exp }}exp</text>
                          </view>
                        </view>
                        
                        <!--   -->
                        <view class="flex flex-col items-end gap-2">
                          <text class="text-[11px] text-[#BBB]">{{ circle.lastActive }}</text>
                          {circle.role === "owner" && (
                            <Link 
                              href={`/circles/${circle.id}/manage`}
                              @click={(e) => e.stopPropagation()}
                              class="p-1.5 rounded-lg bg-[#F5F0E8] text-[#666]"
                            >
                              <Settings class="w-4 h-4" />
                            </Link>
                          )}
                        </view>
                      </view>
                    </view>
                  </Link>
                )
              })
            )}
          </view>
    
          <!--   -->
          <view class="px-4 pt-6 pb-4">
            <view class="grid grid-cols-3 gap-3">
              <Link href="/circles/create" class="bg-white rounded-xl p-4 text-center shadow-sm">
                <view class="w-10 h-10 mx-auto bg-[#C41E3A]/10 rounded-xl flex items-center justify-center mb-2">
                  <Plus class="w-5 h-5 text-[#C41E3A]" />
                </view>
                <text class="text-[12px] text-[#2C2C2C]">创建圈子</text>
              </Link>
              <Link href="/circles/activities" class="bg-white rounded-xl p-4 text-center shadow-sm">
                <view class="w-10 h-10 mx-auto bg-[#FF6B35]/10 rounded-xl flex items-center justify-center mb-2">
                  <Calendar class="w-5 h-5 text-[#FF6B35]" />
                </view>
                <text class="text-[12px] text-[#2C2C2C]">我的活动</text>
              </Link>
              <Link href="/circles/badges" class="bg-white rounded-xl p-4 text-center shadow-sm">
                <view class="w-10 h-10 mx-auto bg-[#C9A96E]/10 rounded-xl flex items-center justify-center mb-2">
                  <Award class="w-5 h-5 text-[#C9A96E]" />
                </view>
                <text class="text-[12px] text-[#2C2C2C]">我的勋章</text>
              </Link>
            </view>
          </view>
    
          <style jsx>{`
            .no-scrollbar::-webkit-scrollbar { display: none; }
            .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
          `}</style>
        </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'

const loading = ref(true)
const error = ref<string | null>(null)

// V0 原始数据
const myCircles = [
const stats = {
const roleConfig = {

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