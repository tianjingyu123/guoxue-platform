<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">settings</text>
      <text class="v0-route">V0: settings</text>
    </view>
        <view class="min-h-screen bg-background max-w-lg mx-auto">
          <!--   -->
          <view class="sticky top-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border">
      <view class="flex items-center justify-between h-14 px-4">
      <BackButton fallbackPath="/profile" />
      <text class="font-semibold text-base text-foreground">设置</text>
              <view class="w-9" />
            </view>
          </view>
    
          <view class="p-4 pb-24 space-y-4">
            <!--   -->
            <Card class="overflow-hidden bg-card">
              <view class="px-4 py-2.5 border-b border-border">
                <text class="text-xs text-muted-foreground font-medium">账号与安全</text>
              </view>
              <view class="divide-y divide-border">
                <SettingRow
                  icon={{ Smartphone }}
                  label="手机号"
                  value="138****8888"
                  type="link"
                  showArrow
                />
                <SettingRow
                  icon={{ Lock }}
                  label="登录密码"
                  value="修改"
                  type="link"
                  showArrow
                />
                <SettingRow
                  icon={{ Shield }}
                  label="二次验证"
                  type="switch"
                  :checked={{ twoFactorEnabled }}
                  onCheckedChange={{ setTwoFactorEnabled }}
                />
              </view>
            </Card>
    
            <!--   -->
            <Card class="overflow-hidden bg-card">
              <view class="px-4 py-2.5 border-b border-border">
                <text class="text-xs text-muted-foreground font-medium">隐私设置</text>
              </view>
              <view class="divide-y divide-border">
                <SettingRow
                  icon={{ Eye }}
                  label="公开展示我的收藏"
                  type="switch"
                  :checked={{ showFavorites }}
                  onCheckedChange={{ setShowFavorites }}
                />
                <SettingRow
                  icon={{ History }}
                  label="记录浏览历史"
                  type="switch"
                  :checked={{ recordHistory }}
                  onCheckedChange={{ setRecordHistory }}
                />
              </view>
            </Card>
    
            <!--   -->
            <Card class="overflow-hidden bg-card">
              <view class="px-4 py-2.5 border-b border-border">
                <text class="text-xs text-muted-foreground font-medium">通知设置</text>
              </view>
              <view class="divide-y divide-border">
                <SettingRow
                  icon={{ Bell }}
                  label="推送通知"
                  type="switch"
                  :checked={{ pushEnabled }}
                  onCheckedChange={{ setPushEnabled }}
                />
                <SettingRow
                  icon={{ Moon }}
                  label="消息免打扰时段"
                  value={{ quietHours }}
                  type="link"
                  showArrow
                  @click={() => setShowSelectModal({
                    title: "消息免打扰时段",
                    options: ["关闭", "22:00-08:00", "23:00-07:00", "00:00-08:00"],
                    current: quietHours,
                    onSelect: setQuietHours
                  })}
                />
              </view>
            </Card>
    
            <!--   -->
            <Card class="overflow-hidden bg-card">
              <view class="px-4 py-2.5 border-b border-border">
                <text class="text-xs text-muted-foreground font-medium">外观主题</text>
              </view>
              <view class="px-4 py-3.5">
                <ThemeSwitch />
              </view>
            </Card>
    
            <!--   -->
            <Card class="overflow-hidden bg-card">
              <view class="px-4 py-2.5 border-b border-border">
                <text class="text-xs text-muted-foreground font-medium">通用设置</text>
              </view>
              <view class="divide-y divide-border">
                <SettingRow
                  icon={{ Eye }}
                  label="默认阅读背景"
                  value={{ readingBg }}
                  type="link"
                  showArrow
                  @click={() => setShowSelectModal({
                    title: "默认阅读背景",
                    options: ["宣纸色", "护眼黄", "夜间黑", "纯白"],
                    current: readingBg,
                    onSelect: setReadingBg
                  })}
                />
                <SettingRow
                  icon={{ Type }}
                  label="字体大小"
                  value={{ fontSize }}
                  type="link"
                  showArrow
                  @click={() => setShowSelectModal({
                    title: "字体大小",
                    options: ["小", "中", "大"],
                    current: fontSize,
                    onSelect: setFontSize
                  })}
                />
                <SettingRow
                  icon={{ Wifi }}
                  label="视频自动播放"
                  value={{ autoPlay }}
                  type="link"
                  showArrow
                  @click={() => setShowSelectModal({
                    title: "视频自动播放",
                    options: ["仅Wi-Fi", "始终", "关闭"],
                    current: autoPlay,
                    onSelect: setAutoPlay
                  })}
                />
              </view>
            </Card>
    
            <!--   -->
            <Card class="overflow-hidden bg-card">
              <view class="px-4 py-2.5 border-b border-border">
                <text class="text-xs text-muted-foreground font-medium">缓存管理</text>
              </view>
              <view class="flex items-center justify-between px-4 py-3.5">
                <view class="flex items-center gap-3">
                  <view class="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                    <Trash2 class="w-4 h-4 text-muted-foreground" />
                  </view>
                  <view>
                    <text class="text-sm text-foreground">缓存数据</text>
                    <text class="text-xs text-muted-foreground mt-0.5">{isClearing ? "清理中..." : cacheSize}</text>
                  </view>
                </view>
                <view class="v0-btn"
                  @click={{ handleClearCache }}
                  :disabled={{ isClearing }}
                  class={cn(
                    "px-3 py-1.5 text-xs font-medium rounded-lg transition-colors",
                    isClearing
                      ? "bg-secondary text-muted-foreground"
                      : "bg-primary/10 text-primary hover:bg-primary/20"
                  )}
                >
                  {isClearing ? "清理中" : "清理缓存"}
                </view>
              </view>
            </Card>
    
            <!--   -->
            <Card class="overflow-hidden bg-card">
              <view class="px-4 py-2.5 border-b border-border">
                <text class="text-xs text-muted-foreground font-medium">关于我们</text>
              </view>
              <view class="divide-y divide-border">
                <SettingRow
                  icon={{ FileText }}
                  label="用户协议"
                  type="link"
                  showArrow
                />
                <SettingRow
                  icon={{ Shield }}
                  label="隐私政策"
                  type="link"
                  showArrow
                />
                <SettingRow
                  icon={{ Info }}
                  label="版本号"
                  value="v1.0.0"
                  type="text"
                />
              </view>
            </Card>
    
            <!--   -->
            <view class="v0-btn"
              @click={() => setShowLogoutConfirm(true)}
              class="w-full py-3.5 text-center text-primary font-medium bg-card rounded-xl hover:bg-primary/5 transition-colors"
            >
              退出登录
            </view>
          </view>
    
          <!--   -->
          {showSelectModal && (
            <view class="fixed inset-0 z-50 flex items-end justify-center">
              <view 
                class="absolute inset-0 bg-black/60"
                @click={() => setShowSelectModal(null)}
              />
              <view class="relative w-full max-w-lg bg-card rounded-t-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
                <view class="px-4 py-4 border-b border-border">
                  <text class="font-semibold text-center text-foreground">{{ showSelectModal.title }}</text>
                </view>
                <view class="py-2">
                  {showSelectModal.options.map((option) => (
                    <view class="v0-btn"
                      key={{ option }}
                      @click={() => {
                        showSelectModal.onSelect(option)
                        setShowSelectModal(null)
                      }}
                      class={cn(
                        "w-full px-4 py-3.5 text-left text-sm transition-colors flex items-center justify-between",
                        option === showSelectModal.current
                          ? "text-primary bg-primary/5"
                          : "text-foreground hover:bg-secondary"
                      )}
                    >
                      {{ option }}
                      {option === showSelectModal.current && (
                        <text class="text-primary">✓</text>
                      )}
                    </view>
                  ))}
                </view>
                <view class="p-4 border-t border-border">
                  <view class="v0-btn"
                    @click={() => setShowSelectModal(null)}
                    class="w-full py-3 text-center text-muted-foreground bg-secondary rounded-xl"
                  >
                    取消
                  </view>
                </view>
              </view>
            </view>
          )}
    
          <!--   -->
          {showLogoutConfirm && (
            <view class="fixed inset-0 z-50 flex items-center justify-center p-4">
              <view 
                class="absolute inset-0 bg-black/60"
                @click={() => setShowLogoutConfirm(false)}
              />
              <view class="relative w-full max-w-sm bg-card rounded-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <view class="p-6 text-center">
                  <text class="font-semibold text-lg text-foreground">确认退出登录？</text>
                  <text class="text-sm text-muted-foreground mt-2">退出后将需要重新登录才能使用完整功能</text>
                </view>
                <view class="flex border-t border-border">
                  <view class="v0-btn"
                    @click={() => setShowLogoutConfirm(false)}
                    class="flex-1 py-3.5 text-center text-foreground font-medium border-r border-border hover:bg-secondary transition-colors"
                  >
                    取消
                  </view>
                  <view class="v0-btn"
                    @click={{ handleLogout }}
                    class="flex-1 py-3.5 text-center text-primary font-medium hover:bg-primary/5 transition-colors"
                  >
                    确认退出
                  </view>
                </view>
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