<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-bar">
        <view class="nav-back" @tap="onNavBack">
          <app-icon name="arrow-left" :size="22" color="#1a1a1a" />
        </view>
        <text class="nav-title">{{ selected ? '公告详情' : '商家公告' }}</text>
        <view class="nav-placeholder" />
      </view>
    </view>

    <scroll-view scroll-y class="scroll" :style="{ paddingTop: navHeight + 'px' }">
      <!-- 详情视图 -->
      <template v-if="selected">
        <view class="detail-card" :style="{ background: noticeTypeConfig[selected.type].bg, borderColor: noticeTypeConfig[selected.type].border }">
          <view class="detail-head">
            <app-icon :name="noticeTypeConfig[selected.type].icon" :size="20" :color="noticeTypeConfig[selected.type].iconColor" />
            <view class="detail-head-body">
              <view class="detail-title-row">
                <text class="detail-title">{{ selected.title }}</text>
                <text class="cat-badge" :style="{ color: noticeCategoryBadge[selected.category].color, background: noticeCategoryBadge[selected.category].bg }">{{ selected.category }}</text>
              </view>
              <view class="detail-time">
                <app-icon name="clock" :size="14" color="#9ca3af" />
                <text class="detail-time-text">{{ selected.time }}</text>
              </view>
            </view>
          </view>
          <text class="detail-content">{{ selected.content }}</text>
        </view>

        <view class="section">
          <text class="section-title">相关操作</text>
          <view v-if="selected.type === 'important'" class="op-btn op-primary" @tap="onAction"><text class="op-primary-text">查看新规则详情</text></view>
          <view v-if="selected.type === 'activity'" class="op-btn op-primary" @tap="onAction"><text class="op-primary-text">立即报名活动</text></view>
          <view v-if="selected.type === 'warning'" class="op-btn op-primary" @tap="onAction"><text class="op-primary-text">查看违规商品</text></view>
          <view class="op-btn op-muted" @tap="selected = null"><text class="op-muted-text">返回列表</text></view>
        </view>
      </template>

      <!-- 列表视图 -->
      <template v-else>
        <view v-if="unreadCount > 0" class="unread-bar">
          <text class="unread-text">您有 {{ unreadCount }} 条未读公告</text>
          <text class="mark-all" @tap="markAllRead">全部标记已读</text>
        </view>

        <view class="list">
          <view
            v-for="notice in notices"
            :key="notice.id"
            class="notice-card"
            :class="{ 'notice-unread': !notice.read }"
            :style="{ background: noticeTypeConfig[notice.type].bg, borderColor: noticeTypeConfig[notice.type].border }"
            @tap="openNotice(notice)"
          >
            <view class="notice-row">
              <app-icon :name="noticeTypeConfig[notice.type].icon" :size="20" :color="noticeTypeConfig[notice.type].iconColor" />
              <view class="notice-body">
                <view class="notice-title-row">
                  <text class="notice-title">{{ notice.title }}</text>
                  <view v-if="!notice.read" class="dot-unread" />
                </view>
                <text class="notice-excerpt">{{ notice.content }}</text>
                <view class="notice-foot">
                  <text class="cat-badge" :style="{ color: noticeCategoryBadge[notice.category].color, background: noticeCategoryBadge[notice.category].bg }">{{ notice.category }}</text>
                  <view class="notice-time">
                    <app-icon name="clock" :size="12" color="#9ca3af" />
                    <text class="notice-time-text">{{ notice.time }}</text>
                  </view>
                </view>
              </view>
            </view>
          </view>
        </view>
      </template>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'
import { merchantNotices, noticeTypeConfig, noticeCategoryBadge } from '@/lib/merchant-data'

type Notice = (typeof merchantNotices)[number]

const statusBarHeight = ref(0)
const navHeight = ref(44)

const sys = uni.getSystemInfoSync()
statusBarHeight.value = sys.statusBarHeight || 0
navHeight.value = (sys.statusBarHeight || 0) + 44

const notices = ref<Notice[]>(merchantNotices.map((n) => ({ ...n })))
const selected = ref<Notice | null>(null)

const unreadCount = computed(() => notices.value.filter((n) => !n.read).length)

function openNotice(notice: Notice) {
  selected.value = notice
  if (!notice.read) {
    const target = notices.value.find((n) => n.id === notice.id)
    if (target) target.read = true
  }
}
function markAllRead() {
  notices.value.forEach((n) => (n.read = true))
}
function onNavBack() {
  if (selected.value) {
    selected.value = null
  } else {
    goBack()
  }
}
function onAction() {
  uni.showToast({ title: '功能开发中', icon: 'none' })
}
</script>

<style scoped>
.page { min-height: 100vh; background: #ffffff; }
.nav { position: fixed; top: 0; left: 0; right: 0; z-index: 50; background: #ffffff; border-bottom: 1px solid #ededed; }
.nav-bar { display: flex; align-items: center; height: 44px; padding: 0 16px; }
.nav-back { width: 32px; height: 32px; display: flex; align-items: center; }
.nav-title { flex: 1; text-align: center; font-size: 17px; font-weight: 600; color: #1a1a1a; }
.nav-placeholder { width: 32px; }
.scroll { height: 100vh; box-sizing: border-box; padding-bottom: 40px; }

.unread-bar { margin: 16px 16px 0; padding: 12px; background: #fef2f4; border: 1px solid #f5c2cb; border-radius: 8px; display: flex; align-items: center; justify-content: space-between; }
.unread-text { font-size: 14px; font-weight: 500; color: #1a1a1a; }
.mark-all { font-size: 12px; color: #c41e3a; }

.list { padding: 16px; display: flex; flex-direction: column; gap: 8px; }
.notice-card { padding: 16px; border-radius: 12px; border: 1px solid transparent; }
.notice-unread { box-shadow: 0 0 0 2px rgba(196, 30, 58, 0.3); }
.notice-row { display: flex; align-items: flex-start; gap: 12px; }
.notice-body { flex: 1; min-width: 0; }
.notice-title-row { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.notice-title { flex: 1; font-size: 15px; font-weight: 600; color: #1a1a1a; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dot-unread { width: 8px; height: 8px; border-radius: 50%; background: #c41e3a; flex-shrink: 0; }
.notice-excerpt { display: block; font-size: 14px; color: rgba(26, 26, 26, 0.7); line-height: 1.5; margin-bottom: 8px; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.notice-foot { display: flex; align-items: center; gap: 8px; }
.cat-badge { font-size: 11px; padding: 2px 8px; border-radius: 4px; }
.notice-time { display: flex; align-items: center; gap: 4px; }
.notice-time-text { font-size: 12px; color: #9ca3af; }

.detail-card { margin: 16px; padding: 16px; border-radius: 12px; border: 1px solid transparent; }
.detail-head { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 16px; }
.detail-head-body { flex: 1; }
.detail-title-row { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; flex-wrap: wrap; }
.detail-title { font-size: 18px; font-weight: 600; color: #1a1a1a; }
.detail-time { display: flex; align-items: center; gap: 4px; }
.detail-time-text { font-size: 14px; color: #9ca3af; }
.detail-content { display: block; font-size: 15px; color: #1a1a1a; line-height: 1.7; }

.section { padding: 8px 16px 0; }
.section-title { display: block; font-size: 14px; font-weight: 600; color: #1a1a1a; margin-bottom: 12px; }
.op-btn { padding: 14px; border-radius: 8px; margin-bottom: 8px; }
.op-primary { background: rgba(196, 30, 58, 0.1); border: 1px solid rgba(196, 30, 58, 0.2); }
.op-primary-text { font-size: 15px; font-weight: 500; color: #c41e3a; }
.op-muted { background: #f3f4f6; }
.op-muted-text { font-size: 15px; font-weight: 500; color: #1a1a1a; }
</style>
