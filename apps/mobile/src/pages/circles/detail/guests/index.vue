<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">圈子</text>
      <text class="v0-route">V0: circles/[id]/guests</text>
    </view>
        <view class="min-h-screen bg-background">
          <!--   -->
          <view class="sticky top-0 z-10 bg-white border-b border-muted">
            <view class="flex items-center justify-between px-4 h-14">
              <view class="v0-btn" @click={() => router.back()} class="p-2 -ml-2">
                <ChevronLeft class="w-5 h-5 text-foreground" />
              </view>
              <text class="font-semibold text-foreground">嘉宾/老师管理</text>
              <view class="v0-btn" 
                @click={() => setShowInviteModal(true)}
                class="p-2 -mr-2 text-primary"
              >
                <UserPlus class="w-5 h-5" />
              </view>
            </view>
    
            <!--   -->
            <view class="px-4 pb-3">
              <view class="relative">
                <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="搜索嘉宾/老师"
                  value={{ searchQuery }}
                  @change={(e) => setSearchQuery(e.target.value)}
                  class="w-full pl-9 pr-4 py-2.5 bg-background rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </view>
            </view>
    
            <!--   -->
            <view class="flex px-4 gap-2 pb-3">
              {[
                { key: "all", label: "全部" },
                { key: "guest", label: "嘉宾" },
                { key: "teacher", label: "老师" },
                { key: "pending", label: "待审核", count: pendingCount },
              ].map(tab => (
                <view class="v0-btn"
                  key={{ tab.key }}
                  @click={() => setActiveTab(tab.key as typeof activeTab)}
                  class={`px-4 py-1.5 rounded-full text-sm transition-all ${
                    activeTab === tab.key
                      ? "bg-primary text-white"
                      : "bg-background text-muted-foreground"
                  }`}
                >
                  {{ tab.label }}
                  {tab.count ? <text class="ml-1 text-xs">({{ tab.count }})</text> : null}
                </view>
              ))}
            </view>
          </view>
    
          <!--   -->
          <view class="p-4 space-y-3">
            {filteredGuests.length === 0 ? (
              <view class="text-center py-12">
                <UserPlus class="w-12 h-12 text-muted mx-auto mb-3" />
                <text class="text-muted-foreground text-sm">暂无嘉宾/老师</text>
                <view class="v0-btn" 
                  @click={() => setShowInviteModal(true)}
                  class="mt-4 px-6 py-2 bg-primary text-white text-sm rounded-xl"
                >
                  邀请嘉宾
                </view>
              </view>
            ) : (
              filteredGuests.map(guest => (
                <view 
                  key={{ guest.id }}
                  class="bg-white rounded-2xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.04)]"
                >
                  <!--   -->
                  <view class="flex items-start gap-3">
                    <image alt="图片" 
                      src={{ guest.avatar }} 
                      alt={{ guest.name }}
                      class="w-12 h-12 rounded-xl"
                    />
                    <view class="flex-1 min-w-0">
                      <view class="flex items-center gap-2">
                        <text class="font-medium text-foreground">{{ guest.name }}</text>
                        <text class={`text-[10px] px-1.5 py-0.5 rounded ${
                          guest.role === "teacher" 
                            ? "bg-info/10 text-info" 
                            : "bg-gold/10 text-gold"
                        }`}>
                          {guest.role === "teacher" ? "老师" : "嘉宾"}
                        </text>
                        {guest.status === "pending" && (
                          <text class="text-[10px] px-1.5 py-0.5 rounded bg-orange-100 text-orange-600">
                            待审核
                          </text>
                        )}
                      </view>
                      <text class="text-xs text-muted-foreground mt-0.5">{{ guest.title }}</text>
                      <text class="text-[10px] text-muted-foreground mt-1">加入于 {{ guest.joinedAt }}</text>
                    </view>
                    <view class="v0-btn" 
                      @click={() => setShowActionMenu(showActionMenu === guest.id ? null : guest.id)}
                      class="p-2 -mr-2 text-muted-foreground"
                    >
                      <MoreVertical class="w-5 h-5" />
                    </view>
                  </view>
    
                  <!--   -->
                  {showActionMenu === guest.id && (
                    <view class="mt-3 pt-3 border-t border-muted flex gap-2">
                      <view class="v0-btn" 
                        @click={() => { setShowEditModal(guest.id); setShowActionMenu(null) }}
                        class="flex-1 flex items-center justify-center gap-1 py-2 text-sm text-muted-foreground bg-background rounded-lg"
                      >
                        <Edit class="w-4 h-4" />
                        编辑
                      </view>
                      <Link 
                        href={`/circles/${circleId}/guests/${{ guest.id }}/revenue`}
                        class="flex-1 flex items-center justify-center gap-1 py-2 text-sm text-muted-foreground bg-background rounded-lg"
                      >
                        <TrendingUp class="w-4 h-4" />
                        收益
                      </Link>
                      <view class="v0-btn" class="flex-1 flex items-center justify-center gap-1 py-2 text-sm text-red-500 bg-red-50 rounded-lg">
                        <Trash2 class="w-4 h-4" />
                        移除
                      </view>
                    </view>
                  )}
    
                  <!--   -->
                  <view class="mt-3 flex flex-wrap gap-1.5">
                    <text class="text-[10px] text-muted-foreground">可发布：</text>
                    {guest.permissions.map(perm => (
                      <text key={perm} class="text-[10px] px-1.5 py-0.5 rounded bg-background text-muted-foreground">
                        {{ permissionLabels[perm] }}
                      </text>
                    ))}
                  </view>
    
                  <!--   -->
                  {guest.status === "active" && (
                    <view class="mt-3 pt-3 border-t border-muted">
                      <view class="grid grid-cols-4 gap-2 text-center">
                        <view>
                          <view class="flex items-center justify-center gap-1 text-muted-foreground">
                            <FileText class="w-3 h-3" />
                            <text class="text-sm font-medium">{{ guest.stats.articles }}</text>
                          </view>
                          <text class="text-[10px] text-muted-foreground">文章</text>
                        </view>
                        <view>
                          <view class="flex items-center justify-center gap-1 text-muted-foreground">
                            <BookOpen class="w-3 h-3" />
                            <text class="text-sm font-medium">{{ guest.stats.courses }}</text>
                          </view>
                          <text class="text-[10px] text-muted-foreground">课程</text>
                        </view>
                        <view>
                          <view class="flex items-center justify-center gap-1 text-muted-foreground">
                            <Radio class="w-3 h-3" />
                            <text class="text-sm font-medium">{{ guest.stats.lives }}</text>
                          </view>
                          <text class="text-[10px] text-muted-foreground">直播</text>
                        </view>
                        <view>
                          <view class="text-sm font-medium text-gold">
                            ¥{{ guest.stats.thisMonthRevenue.toFixed(0) }}
                          </view>
                          <text class="text-[10px] text-muted-foreground">本月收益</text>
                        </view>
                      </view>
                      <view class="mt-2 flex items-center justify-between text-xs">
                        <text class="text-muted-foreground">分成比例：{{ guest.revenueShare }}%</text>
                        <text class="text-muted-foreground">累计收益：¥{{ guest.stats.totalRevenue.toFixed(2) }}</text>
                      </view>
                    </view>
                  )}
    
                  <!--   -->
                  {guest.status === "pending" && (
                    <view class="mt-3 pt-3 border-t border-muted flex gap-2">
                      <view class="v0-btn" class="flex-1 flex items-center justify-center gap-1 py-2.5 text-sm text-white bg-primary rounded-xl">
                        <Check class="w-4 h-4" />
                        通过
                      </view>
                      <view class="v0-btn" class="flex-1 flex items-center justify-center gap-1 py-2.5 text-sm text-muted-foreground bg-background rounded-xl">
                        <X class="w-4 h-4" />
                        拒绝
                      </view>
                    </view>
                  )}
                </view>
              ))
            )}
          </view>
    
          <!--   -->
          {{ showInviteModal && (
            <InviteGuestModal 
              circleId={circleId }}
              onClose={() => setShowInviteModal(false)} 
            />
          )}
    
          <!--   -->
          {showEditModal && (
            <EditGuestModal
              guest={mockGuests.find(g => g.id === showEditModal)!}
              onClose={() => setShowEditModal(null)}
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
const mockGuests = [
const mockPendingInvites = [
const permissionLabels: Record<string, string> = {

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