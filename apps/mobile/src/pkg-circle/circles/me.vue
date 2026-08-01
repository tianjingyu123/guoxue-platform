<script setup lang="ts">
/**
 * 圈子·我的（板块门户 4.3）— V0 circle-me.html 还原（2026-07-10）
 * 定位：圈子专属高频的视图聚合。不放钱包/订单/地址/账号（归全局个人中心）。
 * 结构：身份区 → 圈主后台入口(仅圈主/管理员) → 我的圈子横滑 → 我的内容入口 → 圈子事务(收藏/加入申请/退款) → 边界说明
 * 数据：getMyCircles(带角色) + getMyStats + myRefunds；无聚合统计的项做成纯入口，不编数字（数据流铁律）
 */
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import SmartCover from '@/components/common/smart-cover.vue'
import { goBack, navigateTo } from '@/utils/router'
import { circleApi, isExpertRole, type MyCircle, type MyCircleStats } from '@/lib/circle-data'
import { refundApi, type RefundRequestItem } from '@/lib/circle-refund-data'

const loading = ref(true)
const myCircles = ref<MyCircle[]>([])
const stats = ref<MyCircleStats>({ joinedCount: 0, postCount: 0, likeReceived: 0 })
const refunds = ref<RefundRequestItem[]>([])

// 圈主/管理员的圈子（有则显示圈主后台入口）
const ownerCircle = computed(() => myCircles.value.find((c) => c.role === 'owner' || c.role === 'admin'))
/**
 * 达人资格（可自助配置咨询价格）：后端白名单 OWNER/PARTNER/GUEST。
 * 必须看 rawRole —— role 的三档归并会把 GUEST 压成 member，用它会漏掉嘉宾达人。
 */
const expertCircles = computed(() => myCircles.value.filter((c) => isExpertRole(c.rawRole)))
const createdCount = computed(() => myCircles.value.filter((c) => c.role === 'owner').length)
// 退款进行中提示
const activeRefund = computed(() =>
  refunds.value.find((r) => r.refundStatus === 'refunding' || r.ownerStatus === 'pending' || r.adminStatus === 'pending'),
)
const refundNote = computed(() => {
  if (!refunds.value.length) return ''
  return activeRefund.value ? '审核中' : `${refunds.value.length} 条`
})

async function load() {
  loading.value = true
  const [cRes, sRes, rRes] = await Promise.allSettled([
    circleApi.getMyCircles(),
    circleApi.getMyStats(),
    refundApi.myRefunds(),
  ])
  myCircles.value = cRes.status === 'fulfilled' ? cRes.value : []
  if (sRes.status === 'fulfilled') stats.value = sRes.value
  refunds.value = rRes.status === 'fulfilled' ? rRes.value : []
  loading.value = false
}

function go(url: string) { navigateTo(url) }
function roleLabel(r: MyCircle['role']) { return r === 'owner' ? '圈主' : r === 'admin' ? '管理员' : '成员' }

onMounted(load)
</script>

<template>
  <view class="page">
    <!-- 导航栏 -->
    <view class="navbar">
      <view class="nav-back" @tap="goBack"><app-icon name="arrow-left" :size="44" color="#1A1A1A" /></view>
      <text class="nav-title">圈子·我的</text>
    </view>

    <scroll-view scroll-y class="body">
      <!-- 身份区（轻，不做成就数据卡） -->
      <view class="profile">
        <view class="profile-avatar"><app-icon name="user" :size="56" color="#999999" /></view>
        <view class="profile-info">
          <text class="profile-name">我的圈子</text>
          <text class="profile-sub">加入 {{ stats.joinedCount }} 个圈子 · 创建 {{ createdCount }} 个</text>
        </view>
      </view>

      <!-- 圈主后台入口：仅圈主/管理员可见 -->
      <view v-if="ownerCircle" class="owner-card" @tap="go(`/pkg-circle/circles/dashboard?id=${ownerCircle.id}`)">
        <view class="owner-icon"><app-icon name="crown" :size="34" color="#C9A96E" /></view>
        <view class="owner-body">
          <view class="owner-title">
            <text class="owner-title-txt">圈主后台</text>
            <text class="owner-badge">{{ roleLabel(ownerCircle.role) }}</text>
          </view>
          <text class="owner-sub">{{ ownerCircle.name }}</text>
        </view>
        <app-icon name="chevron-right" :size="30" color="#999999" />
      </view>

      <!-- 达人设置入口：圈主/合伙人/嘉宾可自助定价（提问价/围观价/连麦价） -->
      <view v-if="expertCircles.length" class="owner-card expert-card" @tap="go('/pkg-circle/circles/expert-config')">
        <view class="owner-icon expert-icon"><app-icon name="message-square" :size="32" color="#C41E3A" /></view>
        <view class="owner-body">
          <view class="owner-title">
            <text class="owner-title-txt">我的达人设置</text>
            <text class="expert-badge">咨询定价</text>
          </view>
          <text class="owner-sub">
            设置提问价 · 围观价 · 连麦价{{ expertCircles.length > 1 ? ` · ${expertCircles.length} 个圈子` : '' }}
          </text>
        </view>
        <app-icon name="chevron-right" :size="30" color="#999999" />
      </view>

      <!-- 我的圈子横滑 -->
      <view v-if="myCircles.length" class="section">
        <view class="section-head">
          <text class="section-title">我的圈子</text>
        </view>
        <scroll-view scroll-x class="mine-scroll">
          <view class="mine-row">
            <view
              v-for="c in myCircles" :key="c.id"
              class="mine-card" @tap="go(`/pkg-circle/circles/detail?id=${c.id}`)"
            >
              <view class="mine-cover-wrap">
                <smart-cover
                  :src="c.cover" :title="c.name" type="circle"
                  class="mine-cover" :class="{ 'owner-ring': c.role === 'owner' }"
                />
              </view>
              <text class="mine-name">{{ c.name }}</text>
              <text class="mine-role" :class="c.role">{{ roleLabel(c.role) }}</text>
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- 我的内容：帖子(真实数)/文章/问答·纯入口不编数字 -->
      <view class="section">
        <view class="section-head"><text class="section-title">我的内容</text></view>
        <view class="content-grid">
          <view class="content-cell" @tap="go('/pkg-circle/my-circles/index')">
            <text class="content-num">{{ stats.postCount }}</text>
            <text class="content-label">帖子</text>
          </view>
          <view class="content-cell" @tap="go('/pkg-circle/circles/my-questions')">
            <app-icon name="message-square" :size="40" color="#6E6E73" />
            <text class="content-label">我的问答</text>
          </view>
          <view class="content-cell" @tap="go('/pkg-circle/circles/consult-orders')">
            <app-icon name="headphones" :size="40" color="#6E6E73" />
            <text class="content-label">咨询订单</text>
          </view>
        </view>
      </view>

      <!-- 圈子事务（V0 六项·圈子内收藏无接口降级未放）：发布审核与草稿 / 我的悬赏 / 咨询订单 / 加入申请 / 退款 -->
      <view class="section">
        <view class="section-head"><text class="section-title">圈子事务</text></view>
        <view class="row-list">
          <view class="row" @tap="go('/pkg-circle/circles/notifications')">
            <view class="row-icon"><app-icon name="bell" :size="30" color="#6E6E73" /></view>
            <text class="row-label">圈内通知</text>
            <app-icon name="chevron-right" :size="30" color="#999999" />
          </view>
          <view class="row" @tap="go('/pkg-circle/circles/my-audits')">
            <view class="row-icon"><app-icon name="file-text" :size="30" color="#6E6E73" /></view>
            <text class="row-label">发布审核与草稿</text>
            <app-icon name="chevron-right" :size="30" color="#999999" />
          </view>
          <view class="row" @tap="go('/pkg-bounty/my/index')">
            <view class="row-icon"><app-icon name="clock" :size="30" color="#6E6E73" /></view>
            <text class="row-label">我的悬赏</text>
            <app-icon name="chevron-right" :size="30" color="#999999" />
          </view>
          <view class="row" @tap="go('/pkg-circle/circles/consult-orders')">
            <view class="row-icon"><app-icon name="credit-card" :size="30" color="#6E6E73" /></view>
            <text class="row-label">咨询订单</text>
            <text class="row-note">图文 · 通话</text>
            <app-icon name="chevron-right" :size="30" color="#999999" />
          </view>
          <view class="row" @tap="go('/pkg-circle/circles/my-join-requests')">
            <view class="row-icon"><app-icon name="user-plus" :size="30" color="#6E6E73" /></view>
            <text class="row-label">我的加入申请</text>
            <app-icon name="chevron-right" :size="30" color="#999999" />
          </view>
          <view class="row" @tap="go('/pkg-circle/circles/my-refunds')">
            <view class="row-icon"><app-icon name="wallet" :size="30" color="#6E6E73" /></view>
            <text class="row-label">会员与售后</text>
            <text v-if="refundNote" class="row-note" :class="{ 'active-note': activeRefund }">{{ refundNote }}</text>
            <app-icon name="chevron-right" :size="30" color="#999999" />
          </view>
          <view class="row" @tap="go('/pkg-circle/circles/sanction-notice')">
            <view class="row-icon"><app-icon name="shield" :size="30" color="#6E6E73" /></view>
            <text class="row-label">违规与申诉</text>
            <app-icon name="chevron-right" :size="30" color="#999999" />
          </view>
        </view>
      </view>

      <!-- 边界：账号资产归全局个人中心 -->
      <view class="boundary" @tap="go('/pages/profile/index')">
        <view class="boundary-link">
          <text class="boundary-link-txt">账号与钱包 · 前往个人中心</text>
          <app-icon name="chevron-right" :size="24" color="#999999" />
        </view>
        <text class="boundary-note">余额 · 订单 · 地址 · 实名 · 账号安全 · 消息，均在个人中心统一管理</text>
      </view>

      <view class="safe-bottom" />
    </scroll-view>
  </view>
</template>

<style scoped lang="scss">
.page { min-height: 100vh; background: var(--bg-page, #faf8f5); display: flex; flex-direction: column; }

/* 导航栏 */
.navbar {
  position: sticky; top: 0; z-index: 10;
  display: flex; align-items: center; gap: 8rpx;
  padding: 16rpx 20rpx 10rpx;
  padding-top: calc(var(--status-bar-height, 0px) + 16rpx);
  background: rgba(250, 248, 245, 0.92); backdrop-filter: blur(20rpx);
}
.nav-back { width: 88rpx; height: 88rpx; border-radius: 999rpx; display: flex; align-items: center; justify-content: center; }
.nav-back:active { background: var(--separator, #ede7dd); }
.nav-title { font-size: 34rpx; font-weight: 600; color: var(--text-primary, #2c2c2c); }

.body { flex: 1; }

/* 身份区 */
.profile { display: flex; align-items: center; gap: 24rpx; padding: 24rpx 40rpx 8rpx; }
.profile-avatar {
  width: 112rpx; height: 112rpx; border-radius: 999rpx; flex-shrink: 0;
  background: #fff; box-shadow: 0 0 0 1rpx var(--separator, #ede7dd);
  display: flex; align-items: center; justify-content: center;
}
.profile-info { display: flex; flex-direction: column; }
.profile-name { font-size: 38rpx; font-weight: 700; color: var(--text-primary, #2c2c2c); }
.profile-sub { font-size: 24rpx; color: var(--text-secondary, #6e6e73); margin-top: 4rpx; }

/* 圈主后台入口·金色点缀 */
.owner-card {
  margin: 32rpx 40rpx 0; display: flex; align-items: center; gap: 20rpx;
  background: var(--bg-warm, #f8f4ec); border: 1rpx solid rgba(201, 169, 110, 0.35);
  border-radius: 32rpx; padding: 26rpx 28rpx;
}
.owner-card:active { transform: scale(0.99); }
.owner-icon {
  width: 72rpx; height: 72rpx; border-radius: 20rpx; flex-shrink: 0;
  background: var(--gold-soft, rgba(201, 169, 110, 0.14));
  display: flex; align-items: center; justify-content: center;
}
.owner-body { flex: 1; min-width: 0; }
.owner-title { display: flex; align-items: center; gap: 12rpx; }
.owner-title-txt { font-size: 28rpx; font-weight: 650; color: var(--text-primary, #2c2c2c); }
.owner-badge { font-size: 18rpx; color: var(--gold, #c9a96e); font-weight: 600; border: 1rpx solid var(--gold, #c9a96e); border-radius: 6rpx; padding: 0 8rpx; line-height: 28rpx; }
.owner-sub { display: block; font-size: 24rpx; color: var(--text-secondary, #6e6e73); margin-top: 2rpx; }

/* 达人设置入口（同圈主卡骨架·换朱红点缀，与"经营身份"区分） */
.expert-card { margin-top: 20rpx; border-color: rgba(196, 30, 58, 0.25); background: var(--bg-card, #fff); }
.expert-icon { background: rgba(196, 30, 58, 0.08); }
.expert-badge {
  font-size: 18rpx; color: var(--brand, #c41e3a); font-weight: 600;
  border: 1rpx solid var(--brand, #c41e3a); border-radius: 6rpx;
  padding: 0 8rpx; line-height: 28rpx;
}

/* 分区 */
.section { margin-top: 48rpx; }
.section-head { padding: 0 40rpx; margin-bottom: 20rpx; }
.section-title { font-size: 32rpx; font-weight: 650; color: var(--text-primary, #2c2c2c); }

/* 我的圈子横滑 */
.mine-scroll { width: 100%; white-space: nowrap; }
.mine-row { display: inline-flex; gap: 32rpx; padding: 8rpx 40rpx 16rpx; }
.mine-card { width: 128rpx; display: inline-flex; flex-direction: column; align-items: center; }
.mine-cover-wrap { position: relative; width: 120rpx; height: 120rpx; }
.mine-cover { width: 120rpx; height: 120rpx; border-radius: 36rpx; }
.mine-cover.owner-ring { box-shadow: 0 0 0 3rpx var(--gold, #c9a96e); }
.mine-name { margin-top: 14rpx; font-size: 24rpx; color: var(--text-primary, #2c2c2c); max-width: 128rpx; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-align: center; }
.mine-role { font-size: 20rpx; color: var(--text-tertiary, #999); margin-top: 2rpx; }
.mine-role.owner { color: var(--gold, #c9a96e); font-weight: 600; }
.mine-role.admin { color: var(--gold-2, #d4b87d); }

/* 我的内容四宫格 */
.content-grid { display: flex; gap: 20rpx; padding: 0 40rpx; }
.content-cell {
  flex: 1; background: var(--bg-card, #fff); border-radius: 28rpx;
  padding: 28rpx 0 24rpx; display: flex; flex-direction: column; align-items: center; gap: 6rpx;
  box-shadow: 0 2rpx 4rpx rgba(44, 44, 44, 0.04);
}
.content-cell:active { transform: scale(0.98); }
.content-num { font-size: 38rpx; font-weight: 700; color: var(--text-primary, #2c2c2c); }
.content-label { font-size: 24rpx; color: var(--text-secondary, #6e6e73); }

/* 事务列表 */
.row-list { margin: 0 40rpx; background: var(--bg-card, #fff); border-radius: 32rpx; overflow: hidden; box-shadow: 0 2rpx 4rpx rgba(44, 44, 44, 0.04); }
.row { display: flex; align-items: center; gap: 20rpx; padding: 30rpx 32rpx; border-bottom: 1rpx solid var(--separator, #ede7dd); }
.row:last-child { border-bottom: none; }
.row:active { background: var(--bg-warm, #f8f4ec); }
.row-icon { width: 60rpx; height: 60rpx; border-radius: 18rpx; background: var(--bg-warm, #f8f4ec); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.row-label { flex: 1; font-size: 30rpx; color: var(--text-primary, #2c2c2c); }
.row-note { font-size: 26rpx; color: var(--text-tertiary, #999); }
.row-note.active-note { color: var(--brand, #c41e3a); }

/* 边界说明 */
.boundary { margin-top: 56rpx; display: flex; flex-direction: column; align-items: center; gap: 8rpx; }
.boundary-link { display: flex; align-items: center; gap: 6rpx; }
.boundary-link-txt { font-size: 26rpx; color: var(--text-tertiary, #999); }
.boundary-note { font-size: 22rpx; color: var(--text-tertiary, #999); opacity: 0.75; }

.safe-bottom { height: 60rpx; }
</style>
