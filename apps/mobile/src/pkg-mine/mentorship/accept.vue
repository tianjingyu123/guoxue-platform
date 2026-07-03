<script setup lang="ts">
/**
 * V5 师徒传承 · 拜师落地页（onLoad 取 query token）
 * 看师父招徒卡（昵称/功名/已收徒 N）→ 登录 → 拜师寄语（选填）→ 拜师。
 * 合规：拜师是纯荣誉师门关系，不产生任何资金往来。
 */
import { ref, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateBack, redirectTo, reLaunch } from '@/utils/router'
import { getToken } from '@/utils/storage'
import { mentorshipApi, type MentorInviteInfo } from '@/lib/mentorship-data'

const token = ref('')
const loggedIn = ref(true)

// 招徒卡三态
const loading = ref(true)
const error = ref('')
const info = ref<MentorInviteInfo | null>(null)

// 拜师
const pledge = ref('')
const submitting = ref(false)
// 已有师父态（后端 accept 抛「你已有师父」时置真）
const alreadyHasMentor = ref(false)

async function loadInvite() {
  loading.value = true
  error.value = ''
  try {
    info.value = await mentorshipApi.getInvite(token.value)
  } catch (e) {
    error.value = (e as Error)?.message || '邀请加载失败'
  } finally {
    loading.value = false
  }
}

async function onAccept() {
  if (submitting.value) return
  if (!loggedIn.value) {
    reLaunch('/pkg-auth/login/index')
    return
  }
  submitting.value = true
  try {
    const res = await mentorshipApi.accept(token.value, pledge.value.trim() || undefined)
    uni.showToast({ title: `已拜「${res.mentorNickname || '师父'}」为师`, icon: 'none' })
    setTimeout(() => redirectTo('/pkg-mine/mentorship/index'), 800)
  } catch (e) {
    const msg = (e as Error)?.message || '拜师失败'
    // 已有师父：切到已有师父态提示
    if (msg.includes('已有师父')) alreadyHasMentor.value = true
    uni.showToast({ title: msg, icon: 'none' })
  } finally {
    submitting.value = false
  }
}

function goLogin() {
  reLaunch('/pkg-auth/login/index')
}
function goMyMentorship() {
  redirectTo('/pkg-mine/mentorship/index')
}

onLoad((q: Record<string, string> = {}) => {
  token.value = q.token || ''
})

onMounted(() => {
  loggedIn.value = !!getToken()
  if (!token.value) {
    error.value = '邀请令牌缺失'
    loading.value = false
    return
  }
  loadInvite()
})
</script>

<template>
  <view class="page">
    <view class="hdr">
      <view class="hdr-back" @tap="navigateBack()">
        <AppIcon name="chevron-left" :size="40" color="#666" />
      </view>
      <text class="hdr-title">拜师邀请</text>
      <view class="hdr-ph" />
    </view>

    <scroll-view scroll-y class="body">
      <!-- loading -->
      <view v-if="loading" class="state">
        <view class="skel skel-hero" />
        <view v-for="i in 2" :key="i" class="skel" />
      </view>

      <!-- error / token 失效 -->
      <view v-else-if="error" class="state">
        <AppIcon name="alert-circle" :size="88" color="#ccc" />
        <text class="state-t">{{ error }}</text>
        <text class="state-sub">邀请可能已失效，请让师父重新分享招徒帖</text>
        <view v-if="token" class="btn btn-ghost" @tap="loadInvite"><text class="btn-t-ghost">重试</text></view>
      </view>

      <template v-else-if="info">
        <!-- 师父招徒卡 -->
        <view class="hero">
          <view class="hero-icon"><AppIcon name="graduation-cap" :size="56" color="#fff" /></view>
          <text class="hero-title">{{ info.mentorNickname || 'TA' }} 邀你拜师</text>
          <view class="hero-badge">{{ info.mentorTitle }} · Lv.{{ info.mentorLevel }}</view>
          <text class="hero-sub">已收徒 {{ info.discipleCount }} 人 · 拜入师门，一同修习国学经典之道</text>
        </view>

        <!-- 已有师父态 -->
        <view v-if="alreadyHasMentor" class="state">
          <AppIcon name="check-circle" :size="88" color="#10b981" />
          <text class="state-t">你已有师父在学</text>
          <text class="state-sub">一人一师，需先出师方可再拜新师</text>
          <view class="btn btn-primary" @tap="goMyMentorship"><text class="btn-t">查看我的师徒</text></view>
        </view>

        <!-- 未登录 -->
        <view v-else-if="!loggedIn" class="state">
          <AppIcon name="user" :size="88" color="#ccc" />
          <text class="state-t">登录后即可拜师</text>
          <view class="btn btn-primary" @tap="goLogin"><text class="btn-t">去登录</text></view>
          <text class="state-sub">登录后重开链接继续拜师</text>
        </view>

        <!-- 已登录：拜师寄语 + 拜师 -->
        <template v-else>
          <view class="sec">
            <text class="sec-title">拜师寄语（选填）</text>
            <textarea
              v-model="pledge"
              class="pledge-input"
              placeholder="写下你的求学之志，如「愿承师教，勤学不辍」"
              :maxlength="60"
              :adjust-position="false"
            />
            <text class="pledge-count">{{ pledge.length }}/60</text>
          </view>

          <view class="cta-bar">
            <view
              class="btn btn-primary btn-block"
              :class="{ 'btn-disabled': submitting }"
              @tap="onAccept"
            >
              <text class="btn-t">{{ submitting ? '拜师中…' : '拜师' }}</text>
            </view>
          </view>
        </template>
      </template>

      <view class="disclaimer">
        <text class="disclaimer-t">师徒传承为纯文化荣誉体系，拜师不产生任何费用或资金关系。传道值仅为师门荣誉记录，不可兑换任何财物。</text>
      </view>
    </scroll-view>
  </view>
</template>

<style scoped lang="scss">
.page { min-height: 100vh; background: #faf8f5; display: flex; flex-direction: column; }
.hdr { position: sticky; top: 0; z-index: 20; display: flex; align-items: center; justify-content: space-between; padding: 16rpx 24rpx; background: #fff; border-bottom: 2rpx solid #eee; padding-top: calc(var(--status-bar-height, 0px) + 16rpx); }
.hdr-back { padding: 6rpx; }
.hdr-title { font-size: 32rpx; font-weight: 600; color: #2c2c2c; }
.hdr-ph { width: 52rpx; }
.body { flex: 1; }

.hero { margin: 24rpx; padding: 44rpx 32rpx; border-radius: 28rpx; background: linear-gradient(135deg, #b4432f, #d9542b); display: flex; flex-direction: column; align-items: center; text-align: center; }
.hero-icon { width: 112rpx; height: 112rpx; border-radius: 28rpx; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; margin-bottom: 20rpx; }
.hero-title { font-size: 36rpx; font-weight: 700; color: #fff; }
.hero-badge { margin-top: 14rpx; padding: 6rpx 22rpx; border-radius: 999rpx; background: rgba(255,255,255,0.22); color: #fff; font-size: 24rpx; font-weight: 600; }
.hero-sub { font-size: 24rpx; color: rgba(255,255,255,0.9); line-height: 1.6; margin-top: 16rpx; }

.sec { padding: 8rpx 32rpx; }
.sec-title { font-size: 30rpx; font-weight: 600; color: #2c2c2c; }
.pledge-input { margin-top: 20rpx; width: 100%; height: 180rpx; box-sizing: border-box; padding: 24rpx; border-radius: 20rpx; background: #fff; border: 2rpx solid #eee; font-size: 28rpx; color: #2c2c2c; }
.pledge-count { display: block; margin-top: 10rpx; text-align: right; font-size: 22rpx; color: #bbb; }

.state { display: flex; flex-direction: column; align-items: center; padding: 72rpx 48rpx; gap: 16rpx; }
.state-t { font-size: 28rpx; color: #666; font-weight: 500; }
.state-sub { font-size: 24rpx; color: #bbb; text-align: center; line-height: 1.5; }
.skel { width: calc(100% - 64rpx); height: 120rpx; margin: 12rpx 0; border-radius: 20rpx; background: #eee; }
.skel-hero { height: 240rpx; }

.cta-bar { padding: 32rpx; }
.btn { padding: 26rpx 48rpx; border-radius: 999rpx; text-align: center; display: flex; align-items: center; justify-content: center; }
.btn-block { width: 100%; }
.btn-primary { background: #b4432f; }
.btn-t { font-size: 30rpx; font-weight: 600; color: #fff; }
.btn-ghost { border: 2rpx solid #ddd; background: transparent; }
.btn-t-ghost { font-size: 26rpx; color: #666; }
.btn-disabled { opacity: 0.5; }

.disclaimer { padding: 32rpx 40rpx 48rpx; }
.disclaimer-t { font-size: 22rpx; color: #aaa; line-height: 1.6; text-align: center; }
</style>
