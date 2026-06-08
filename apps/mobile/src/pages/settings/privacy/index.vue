<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">privacy</text>
      <text class="v0-route">V0: settings/privacy</text>
    </view>
        <view class="min-h-screen bg-background">
          <!--   -->
          <view class="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
            <view class="flex items-center justify-between px-4 py-3">
              <view class="flex items-center gap-3">
                <Link href="/settings" class="p-1">
                  <ArrowLeft class="w-5 h-5" />
                </Link>
                <text class="text-lg font-semibold">隐私设置</text>
              </view>
            </view>
          </view>
    
          <view class="p-4 space-y-4">
            <!--   -->
            <BreadcrumbNav class="mb-2" />
            
            <!--   -->
            <Card class="overflow-hidden">
              <view class="px-4 py-2.5 border-b border-border">
                <text class="text-xs text-muted-foreground font-medium">个人信息可见性</text>
              </view>
              <view class="divide-y divide-border">
                <SettingRow
                  icon={{ Globe }}
                  title="显示在线状态"
                  description="其他用户可以看到您是否在线"
                  :checked={{ showOnlineStatus }}
                  @change={{ setShowOnlineStatus }}
                />
                <SettingRow
                  icon={{ Clock }}
                  title="显示最后上线时间"
                  description="其他用户可以看到您的最后活跃时间"
                  :checked={{ showLastSeen }}
                  @change={{ setShowLastSeen }}
                />
                <SettingRow
                  icon={{ MapPin }}
                  title="显示位置信息"
                  description="在内容中显示您的地理位置"
                  :checked={{ showLocation }}
                  @change={{ setShowLocation }}
                />
                <SettingRow
                  icon={{ Heart }}
                  title="公开收藏夹"
                  description="其他用户可以查看您的收藏内容"
                  :checked={{ showFavorites }}
                  @change={{ setShowFavorites }}
                />
                <SettingRow
                  icon={{ Users }}
                  title="公开关注列表"
                  description="其他用户可以查看您关注的人"
                  :checked={{ showFollowing }}
                  @change={{ setShowFollowing }}
                />
              </view>
            </Card>
    
            <!--   -->
            <Card class="overflow-hidden">
              <view class="px-4 py-2.5 border-b border-border">
                <text class="text-xs text-muted-foreground font-medium">互动权限</text>
              </view>
              <view class="divide-y divide-border">
                <SelectRow
                  icon={{ MessageCircle }}
                  title="谁可以私信我"
                  value={{ whoCanMessage }}
                  options={{ messageOptions }}
                  @change={{ setWhoCanMessage }}
                />
                <SelectRow
                  icon={{ MessageCircle }}
                  title="谁可以评论我"
                  value={{ whoCanComment }}
                  options={{ commentOptions }}
                  @change={{ setWhoCanComment }}
                />
                <SelectRow
                  icon={{ Users }}
                  title="我加入的圈子"
                  value={{ whoCanSeeCircle }}
                  options={{ circleOptions }}
                  @change={{ setWhoCanSeeCircle }}
                />
              </view>
            </Card>
    
            <!--   -->
            <Card class="overflow-hidden">
              <Link href="/settings/blacklist">
                <view class="px-4 py-3 flex items-center justify-between hover:bg-secondary/30 transition-colors">
                  <view class="flex items-center gap-3">
                    <view class="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                      <UserX class="w-4 h-4 text-red-500" />
                    </view>
                    <view>
                      <text class="text-sm font-medium">黑名单管理</text>
                      <text class="text-[10px] text-muted-foreground">已拉黑 3 人</text>
                    </view>
                  </view>
                  <ArrowLeft class="w-4 h-4 text-muted-foreground rotate-180" />
                </view>
              </Link>
            </Card>
    
            <!--   -->
            <Card class="overflow-hidden">
              <view class="px-4 py-2.5 border-b border-border">
                <text class="text-xs text-muted-foreground font-medium">其他</text>
              </view>
              <view class="divide-y divide-border">
                <SettingRow
                  icon={{ Clock }}
                  title="记录浏览历史"
                  description="记录您浏览过的内容，方便回顾"
                  :checked={{ recordHistory }}
                  @change={{ setRecordHistory }}
                />
                <SettingRow
                  icon={{ Eye }}
                  title="个性化推荐"
                  description="基于您的兴趣推荐相关内容"
                  :checked={{ personalizedRecommend }}
                  @change={{ setPersonalizedRecommend }}
                />
              </view>
            </Card>
    
            <!--   -->
            <text class="text-[10px] text-muted-foreground text-center px-4">
              隐私设置修改后立即生效，部分设置可能需要刷新页面查看效果
            </text>
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
  const messageOptions = [
  const commentOptions = [
  const circleOptions = [

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