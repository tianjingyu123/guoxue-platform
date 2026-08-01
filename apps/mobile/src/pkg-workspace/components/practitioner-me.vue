<script setup lang="ts">
/**
 * 我的（对应 V0 practitioner-me.tsx）
 * 从业者身份卡 + 会员状态 + 案例库/账本/品牌落款入口 + 执业统计。
 *
 * 统计数字全部来自后端真实计数（客户/报告/案例/从业天数）。V0 原稿写死的
 * 「累计服务 3742 人 · 好评率 99%」这类没有数据支撑的荣誉数字，一律不搬。
 */
import { ref, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import PaperCard from '@/components/paipan/paper-card.vue'
import { wsApi } from '../lib/workspace-api'

const loading = ref(true)
const failed = ref(false)
const profile = ref<any>(null)

const MENU = [
  { key: 'cases', label: '案例库', desc: '沉淀做过的单子，复盘时快速翻出同类盘', icon: 'book-marked', url: '/pkg-workspace/cases/index' },
  { key: 'ledger', label: '收入账本', desc: '平台收益 + 线下手记，一本账看全', icon: 'wallet', url: '/pkg-workspace/ledger/index' },
  { key: 'brand', label: '品牌落款', desc: '报告上署你的名号与印章', icon: 'crown', url: '/pkg-workspace/brand/index' },
]

async function load() {
  loading.value = true
  failed.value = false
  try {
    profile.value = await wsApi.profile()
  } catch {
    failed.value = true
  } finally {
    loading.value = false
  }
}

onMounted(load)
onShow(() => {
  if (!loading.value) load()
})

function go(url: string) {
  uni.navigateTo({ url })
}

function goPro() {
  uni.navigateTo({ url: '/pkg-workspace/pro/index' })
}

function dateText(iso?: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
</script>

<template>
  <view class="pm">
    <view v-if="loading" class="pm-skeleton" />

    <view v-else-if="failed" class="pm-failed" @tap="load">
      <text class="pm-failed-txt">加载失败，点击重试</text>
    </view>

    <template v-else-if="profile">
      <!-- 身份卡 -->
      <PaperCard gold padding="lg">
        <view class="pm-id">
          <view class="pm-avatar">{{ profile.brand?.avatarText || (profile.name || '易').slice(0, 1) }}</view>
          <view class="pm-id-info">
            <text class="pm-id-name">{{ profile.name || '未设置昵称' }}</text>
            <text class="pm-id-title">{{ profile.brand?.title || '尚未填写职称' }}</text>
            <text v-if="profile.brand?.brandName" class="pm-id-brand">{{ profile.brand.brandName }}</text>
          </view>
        </view>

        <view class="pm-stats">
          <view class="pm-stat">
            <text class="pm-stat-v">{{ profile.stats?.clientCount ?? 0 }}</text>
            <text class="pm-stat-l">客户</text>
          </view>
          <view class="pm-stat pm-stat--mid">
            <text class="pm-stat-v">{{ profile.stats?.reportCount ?? 0 }}</text>
            <text class="pm-stat-l">报告</text>
          </view>
          <view class="pm-stat pm-stat--mid">
            <text class="pm-stat-v">{{ profile.stats?.caseCount ?? 0 }}</text>
            <text class="pm-stat-l">案例</text>
          </view>
          <view class="pm-stat">
            <text class="pm-stat-v">{{ profile.stats?.joinDays ?? 0 }}</text>
            <text class="pm-stat-l">从业天数</text>
          </view>
        </view>
      </PaperCard>

      <!-- 会员 -->
      <PaperCard padding="lg">
        <view class="pm-pro" @tap="goPro">
          <view class="pm-pro-icon">
            <AppIcon name="crown" :size="22" color="#fff" />
          </view>
          <view class="pm-pro-info">
            <text class="pm-pro-title">从业者会员</text>
            <text class="pm-pro-desc">
              {{
                profile.pro?.isPro
                  ? `已开通 · ${dateText(profile.pro.expireAt)} 到期（剩 ${profile.pro.daysLeft} 天）`
                  : `¥${profile.pro?.price ?? '--'}/${profile.pro?.period ?? '月'} · 报告不限份数、交付客户、品牌落款`
              }}
            </text>
          </view>
          <text class="pm-pro-cta">{{ profile.pro?.isPro ? '续费' : '开通' }}</text>
        </view>
      </PaperCard>

      <!-- 菜单 -->
      <PaperCard padding="none">
        <view
          v-for="(m, i) in MENU"
          :key="m.key"
          class="pm-menu"
          :class="{ 'pm-menu--line': i !== MENU.length - 1 }"
          @tap="go(m.url)"
        >
          <view class="pm-menu-icon">
            <AppIcon :name="m.icon" :size="20" color="#C41E3A" />
          </view>
          <view class="pm-menu-info">
            <text class="pm-menu-label">{{ m.label }}</text>
            <text class="pm-menu-desc">{{ m.desc }}</text>
          </view>
          <AppIcon name="chevron-right" :size="16" color="#B8AA9A" />
        </view>
      </PaperCard>
    </template>
  </view>
</template>

<style lang="scss" scoped>
.pm {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
  padding: 24rpx 24rpx 48rpx;
}

.pm-skeleton {
  height: 500rpx;
  border-radius: 16rpx;
  background: rgba(154, 140, 126, 0.1);
}

.pm-failed {
  padding: 80rpx;
  text-align: center;
}

.pm-failed-txt {
  font-size: 26rpx;
  color: #C41E3A;
}

/* 身份 */
.pm-id {
  display: flex;
  align-items: center;
  gap: 24rpx;
}

.pm-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 112rpx;
  height: 112rpx;
  flex-shrink: 0;
  border-radius: 50%;
  background: #C41E3A;
  font-size: 44rpx;
  font-weight: 700;
  color: #fff;
}

.pm-id-info {
  flex: 1;
  min-width: 0;
}

.pm-id-name {
  display: block;
  font-size: 34rpx;
  font-weight: 700;
  color: #3A2A1E;
}

.pm-id-title {
  display: block;
  margin-top: 4rpx;
  font-size: 24rpx;
  color: #9A8C7E;
}

.pm-id-brand {
  display: inline-block;
  margin-top: 8rpx;
  padding: 2rpx 12rpx;
  border-radius: 6rpx;
  background: rgba(196, 30, 58, 0.08);
  font-size: 21rpx;
  color: #C41E3A;
}

.pm-stats {
  display: flex;
  margin-top: 28rpx;
  padding-top: 24rpx;
  border-top: 1rpx solid rgba(196, 30, 58, 0.15);
}

.pm-stat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
}

.pm-stat--mid {
  border-left: 1rpx solid rgba(196, 30, 58, 0.12);
  border-right: 1rpx solid rgba(196, 30, 58, 0.12);
}

.pm-stat-v {
  font-size: 32rpx;
  font-weight: 700;
  color: #3A2A1E;
}

.pm-stat-l {
  font-size: 21rpx;
  color: #9A8C7E;
}

/* 会员 */
.pm-pro {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.pm-pro-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 76rpx;
  height: 76rpx;
  flex-shrink: 0;
  border-radius: 16rpx;
  background: #C41E3A;
}

.pm-pro-info {
  flex: 1;
  min-width: 0;
}

.pm-pro-title {
  display: block;
  font-size: 28rpx;
  font-weight: 700;
  color: #3A2A1E;
}

.pm-pro-desc {
  display: block;
  margin-top: 4rpx;
  font-size: 21rpx;
  line-height: 1.5;
  color: #9A8C7E;
}

.pm-pro-cta {
  flex-shrink: 0;
  padding: 8rpx 24rpx;
  border: 1rpx solid rgba(196, 30, 58, 0.4);
  border-radius: 28rpx;
  font-size: 24rpx;
  font-weight: 600;
  color: #C41E3A;
}

/* 菜单 */
.pm-menu {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 28rpx 24rpx;
}

.pm-menu--line {
  border-bottom: 1rpx solid rgba(58, 42, 30, 0.08);
}

.pm-menu-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 72rpx;
  height: 72rpx;
  flex-shrink: 0;
  border-radius: 16rpx;
  background: rgba(196, 30, 58, 0.08);
}

.pm-menu-info {
  flex: 1;
  min-width: 0;
}

.pm-menu-label {
  display: block;
  font-size: 28rpx;
  font-weight: 700;
  color: #3A2A1E;
}

.pm-menu-desc {
  display: block;
  margin-top: 4rpx;
  font-size: 21rpx;
  color: #9A8C7E;
}
</style>
