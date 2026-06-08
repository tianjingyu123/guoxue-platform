<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">我的</text>
      <text class="v0-route">V0: mine/settings</text>
    </view>
        <view class="min-h-screen bg-[#FAF8F5]">
          <!--   -->
          <view class="sticky top-0 z-30 bg-white border-b border-[#E8E3DB]">
            <view class="flex items-center h-14 px-4">
              <view class="v0-btn" @click={() => router.back()} class="p-2 -ml-2 text-[#2C2C2C]">
                <ChevronLeft size={{ 22 }} />
              </view>
              <text class="flex-1 text-center font-semibold text-[#2C2C2C] font-serif">设置</text>
              <view class="w-10" />
            </view>
          </view>
    
          <view class="pb-8 space-y-4 pt-4">
    
            <!--   -->
            <Section title="账号安全">
              <RowLink icon={{ <Shield size={18 }} class="text-[#C41E3A]" />} label="账号安全中心" badge="安全分 82" badgeColor="text-amber-600" @click={() => router.push('/mine/security')} />
              <RowLink icon={{ <Lock size={18 }} class="text-[#666]" />} label="修改密码" sub="上次修改：30天前" @click={() => router.push('/mine/change-password')} />
              <RowLink icon={{ <Phone size={18 }} class="text-[#666]" />} label="修改手机号" sub="138****8888" @click={() => router.push('/mine/change-phone')} />
              <RowLink icon={{ <CreditCard size={18 }} class="text-[#666]" />} label="支付密码" sub="已设置" @click={() => router.push('/mine/pay-password')} />
              <RowLink
                icon={{ <Trash2 size={18 }} class="text-red-500" />}
                label="账号注销"
                labelColor="text-red-500"
                hideCaret
                @click={() => router.push('/mine/deactivate')}
              />
            </Section>
    
            <!--   -->
            <Section title="通知设置">
              
    <view v-for="(item, i) in notifItems" :key="i"> (
                <view
                  key={item.key}
                  class={`flex items-center gap-3 px-4 py-3.5 bg-white ${i < notifItems.length - 1 ? 'border-b border-[#E8E3DB]' : ''}`}
                >
                  <text class="text-[#999]">{{ item.icon }}</text>
                  <text class="flex-1 text-[#2C2C2C] text-sm">{{ item.label }}</text>
                  <view class="v0-btn"
                    @click={() => setNotifications(prev => ({ ...prev, [item.key]: !prev[item.key] }))}
                    class={`relative w-11 h-6 rounded-full transition-colors ${item.value ? 'bg-[#C41E3A]' : 'bg-gray-200'}`}
                  >
                    <text class={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${item.value ? 'translate-x-5' : ''}`} />
                  </view>
                </view>
              ))}
            </Section>
    
            <!--   -->
            <Section title="隐私设置">
              <RowLink icon={{ <UserX size={18 }} class="text-[#666]" />} label="黑名单管理" @click={() => router.push('/mine/blacklist')} />
              <RowLink
                icon={{ <Eye size={18 }} class="text-[#666]" />}
                label="谁可以看我的收藏"
                sub={collectOptions.find(o => o.value === collectVisible)?.label}
                @click={() => setShowCollectDialog(true)}
              />
              <view class="flex items-center gap-3 px-4 py-3.5 bg-white">
                <EyeOff size={{ 18 }} class="text-[#999]" />
                <text class="flex-1 text-[#2C2C2C] text-sm">浏览记录可见</text>
                <view class="v0-btn"
                  @click={() => setHistoryVisible(v => !v)}
                  class={`relative w-11 h-6 rounded-full transition-colors ${historyVisible ? 'bg-[#C41E3A]' : 'bg-gray-200'}`}
                >
                  <text class={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${historyVisible ? 'translate-x-5' : ''}`} />
                </view>
              </view>
              <RowLink icon={{ <History size={18 }} class="text-[#666]" />} label="清除浏览历史" @click={() => {}} />
            </Section>
    
            <!--   -->
            <Section title="通用">
              <RowLink
                icon={{ <HardDrive size={18 }} class="text-[#666]" />}
                label="清除缓存"
                sub={cacheCleared ? '已清除' : cacheSize}
                subColor={cacheCleared ? 'text-green-500' : 'text-[#999]'}
                hideCaret={{ false }}
                @click={() => setShowClearCacheDialog(true)}
              />
              <RowLink
                icon={{ <Type size={18 }} class="text-[#666]" />}
                label="字体大小"
                sub={fontOptions.find(o => o.value === fontSize)?.label}
                @click={() => setShowFontDialog(true)}
              />
              <RowLink
                icon={{ <Moon size={18 }} class="text-[#666]" />}
                label="深色模式"
                sub={darkOptions.find(o => o.value === darkMode)?.label}
                @click={() => setShowDarkDialog(true)}
              />
            </Section>
    
            <!--   -->
            <Section title="其他">
              <RowLink icon={{ <HelpCircle size={18 }} class="text-[#666]" />} label="帮助与反馈" @click={() => router.push('/mine/feedback')} />
              <RowLink icon={{ <Info size={18 }} class="text-[#666]" />} label="关于我们" sub="v3.2.1" @click={() => router.push('/mine/about')} />
            </Section>
    
            <!--   -->
            <view class="px-4">
              <view class="v0-btn"
                @click={() => setShowLogoutDialog(true)}
                class="w-full py-3.5 bg-white rounded-2xl text-red-500 font-medium text-sm shadow-sm active:scale-98 transition-transform"
              >
                退出登录
              </view>
            </view>
          </view>
    
          <!--   -->
          {showLogoutDialog && (
            <Dialog onClose={() => setShowLogoutDialog(false)}>
              <text class="text-[#2C2C2C] font-semibold text-base text-center">确认退出登录？</text>
              <text class="text-[#999] text-sm text-center mt-1">退出后需重新登录才能使用完整功能</text>
              <view class="flex gap-3 mt-5">
                <view class="v0-btn" @click={() => setShowLogoutDialog(false)} class="flex-1 py-2.5 rounded-xl border border-[#E8E3DB] text-[#666] text-sm">取消</view>
                <view class="v0-btn" @click={{ handleLogout }} class="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-medium">退出登录</view>
              </view>
            </Dialog>
          )}
    
          <!--   -->
          {showClearCacheDialog && (
            <Dialog onClose={() => setShowClearCacheDialog(false)}>
              <text class="text-[#2C2C2C] font-semibold text-base text-center">清除缓存</text>
              <text class="text-[#999] text-sm text-center mt-1">将清除 <text class="text-[#C41E3A] font-medium">{{ cacheSize }}</text> 的缓存数据</text>
              <text class="text-[#999] text-xs text-center mt-1">不影响账号数据和下载内容</text>
              <view class="flex gap-3 mt-5">
                <view class="v0-btn" @click={() => setShowClearCacheDialog(false)} class="flex-1 py-2.5 rounded-xl border border-[#E8E3DB] text-[#666] text-sm">取消</view>
                <view class="v0-btn" @click={{ handleClearCache }} class="flex-1 py-2.5 rounded-xl bg-[#C41E3A] text-white text-sm font-medium">确认清除</view>
              </view>
            </Dialog>
          )}
    
          <!--   -->
          {showFontDialog && (
            <OptionDialog
              title="字体大小"
              options={{ fontOptions }}
              value={{ fontSize }}
              @change={(v) => setFontSize(v as typeof fontSize)}
              onClose={() => setShowFontDialog(false)}
            />
          )}
    
          <!--   -->
          {showDarkDialog && (
            <OptionDialog
              title="深色模式"
              options={{ darkOptions }}
              value={{ darkMode }}
              @change={(v) => setDarkMode(v as typeof darkMode)}
              onClose={() => setShowDarkDialog(false)}
            />
          )}
    
          <!--   -->
          {showCollectDialog && (
            <OptionDialog
              title="谁可以看我的收藏"
              options={{ collectOptions }}
              value={{ collectVisible }}
              @change={(v) => setCollectVisible(v as typeof collectVisible)}
              onClose={() => setShowCollectDialog(false)}
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
  const collectOptions = [
  const fontOptions = [
  const darkOptions = [
  const notifItems: SwitchItem[] = [

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