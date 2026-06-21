<script setup lang="ts">
/**
 * 圈子智能体（从原型 app/circles/bots/page.tsx 高保真迁移）
 * 红色渐变头(圈子信息摘要) + 搜索/排序 + 管理员创建入口 + Bot 两列网格卡片。
 */
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo, toastComingSoon } from '@/utils/router'
import { circleSummary, queryBots, formatUsageCount, type SortBy, type CircleBotItem } from '@/lib/circle-bots-data'

const circleId = ref(1)
const circle = circleSummary
const keyword = ref('')
const inputVal = ref('')
const sortBy = ref<SortBy>('hot')

const sortOptions: { value: SortBy; label: string }[] = [
  { value: 'hot', label: '最热' },
  { value: 'new', label: '最新' },
  { value: 'usage', label: '使用量' },
]

const bots = computed<CircleBotItem[]>(() => queryBots(keyword.value, sortBy.value))

onLoad((q) => { if (q?.circleId) circleId.value = Number(q.circleId) || 1 })

function doSearch() { keyword.value = inputVal.value }
function openBot(bot: CircleBotItem) {
  navigateTo(`/pkg-agent/bots/chat?id=${bot.id}&from=circle&circleId=${circleId.value}`)
}
</script>

<template>
  <view class="cb">
    <!-- 红色渐变头 -->
    <view class="cb-top">
      <view
        class="cb-top-nav"
        :style="{ paddingTop: 'calc(24rpx + var(--status-bar-height, 0px))' }"
      >
        <view
          class="cb-nav-btn"
          @tap="goBack"
        >
          <app-icon
            name="arrow-left"
            :size="36"
            color="#ffffff"
          />
        </view>
        <text class="cb-top-title">
          圈子智能体
        </text>
        <view
          v-if="circle.isAdmin"
          class="cb-nav-btn"
          @tap="toastComingSoon"
        >
          <app-icon
            name="settings"
            :size="36"
            color="#ffffff"
          />
        </view>
        <view
          v-else
          class="cb-nav-btn"
        />
      </view>
      <!-- 圈子信息摘要 -->
      <view class="cb-summary">
        <image
          :src="circle.icon"
          class="cb-summary-icon"
          mode="aspectFill"
        />
        <view class="cb-summary-main">
          <view class="cb-summary-name-row">
            <text class="cb-summary-name">
              {{ circle.name }}
            </text>
            <text
              v-if="circle.isOwner"
              class="cb-summary-badge gold"
            >
              圈主
            </text>
            <text
              v-else-if="circle.isAdmin"
              class="cb-summary-badge ghost"
            >
              管理员
            </text>
          </view>
          <text class="cb-summary-desc">
            {{ circle.description }}
          </text>
        </view>
        <view class="cb-summary-total">
          <text class="cb-summary-total-n">
            {{ bots.length }}
          </text>
          <text class="cb-summary-total-l">
            智能体
          </text>
        </view>
      </view>
    </view>

    <scroll-view
      scroll-y
      class="cb-body"
    >
      <!-- 搜索 + 排序 -->
      <view class="cb-filter">
        <view class="cb-search-row">
          <view class="cb-search">
            <app-icon
              name="search"
              :size="30"
              color="#999999"
            />
            <input
              v-model="inputVal"
              class="cb-search-input"
              placeholder="搜索智能体"
              placeholder-class="cb-ph"
              confirm-type="search"
              @confirm="doSearch"
            >
          </view>
          <view
            class="cb-search-btn"
            @tap="doSearch"
          >
            <text class="cb-search-btn-t">
              搜索
            </text>
          </view>
        </view>
        <view class="cb-sorts">
          <view
            v-for="opt in sortOptions"
            :key="opt.value"
            class="cb-sort"
            :class="{ on: sortBy === opt.value }"
            @tap="sortBy = opt.value"
          >
            <text
              class="cb-sort-t"
              :class="{ on: sortBy === opt.value }"
            >
              {{ opt.label }}
            </text>
          </view>
        </view>
      </view>

      <!-- 管理员创建入口 -->
      <view
        v-if="circle.isAdmin"
        class="cb-create-wrap"
      >
        <view
          class="cb-create"
          @tap="toastComingSoon"
        >
          <view class="cb-create-icon">
            <app-icon
              name="plus"
              :size="36"
              color="#ffffff"
            />
          </view>
          <view class="cb-create-main">
            <text class="cb-create-title">
              创建圈子专属智能体
            </text>
            <text class="cb-create-desc">
              为圈友打造定制化AI助手
            </text>
          </view>
          <app-icon
            name="chevron-right"
            :size="32"
            color="#999999"
          />
        </view>
      </view>

      <!-- Bot 网格 -->
      <view class="cb-grid">
        <view
          v-for="bot in bots"
          :key="bot.id"
          class="cb-card"
          @tap="openBot(bot)"
        >
          <!-- 头部标签 -->
          <view class="cb-card-head">
            <view class="cb-card-tags">
              <view
                v-if="bot.isPinned"
                class="cb-tag-badge red"
              >
                <app-icon
                  name="pin"
                  :size="18"
                  color="#ffffff"
                /><text class="cb-tag-badge-t">
                  置顶
                </text>
              </view>
              <view
                v-if="bot.isOfficial"
                class="cb-tag-badge gold"
              >
                <app-icon
                  name="crown"
                  :size="18"
                  color="#ffffff"
                /><text class="cb-tag-badge-t">
                  官方
                </text>
              </view>
              <view
                v-if="bot.isNew && !bot.isPinned && !bot.isOfficial"
                class="cb-tag-badge green"
              >
                <text class="cb-tag-badge-t">
                  NEW
                </text>
              </view>
            </view>
            <image
              :src="bot.avatar"
              class="cb-card-avatar"
              mode="aspectFill"
            />
            <text class="cb-card-name">
              {{ bot.name }}
            </text>
          </view>
          <!-- 描述 -->
          <text class="cb-card-desc">
            {{ bot.description }}
          </text>
          <!-- 标签 -->
          <view class="cb-card-taglist">
            <text
              v-for="t in bot.tags.slice(0, 3)"
              :key="t"
              class="cb-card-tag"
            >
              {{ t }}
            </text>
          </view>
          <!-- 底部信息 -->
          <view class="cb-card-foot">
            <view class="cb-card-stat">
              <app-icon
                name="star"
                :size="20"
                color="#C9A96E"
                :fill="true"
              /><text class="cb-card-stat-t">
                {{ bot.rating }}
              </text>
            </view>
            <view class="cb-card-stat">
              <app-icon
                name="zap"
                :size="20"
                color="#999999"
              /><text class="cb-card-stat-t">
                {{ formatUsageCount(bot.usageCount) }}
              </text>
            </view>
            <text
              v-if="bot.price > 0"
              class="cb-card-price"
            >
              {{ bot.price }}币/次
            </text>
            <text
              v-else
              class="cb-card-free"
            >
              免费
            </text>
          </view>
          <!-- 创建者 -->
          <view class="cb-card-creator">
            <image
              :src="bot.creator.avatar"
              class="cb-card-creator-avatar"
              mode="aspectFill"
            />
            <text class="cb-card-creator-name">
              {{ bot.creator.nickname }}
            </text>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<style scoped lang="scss">
.cb { display: flex; flex-direction: column; height: 100vh; background: #FAF8F5; }
/* 红色渐变头 */
.cb-top { background: linear-gradient(135deg, #C41E3A, #8B0000); padding: 0 32rpx 32rpx; flex-shrink: 0; }
.cb-top-nav { display: flex; align-items: center; justify-content: space-between; padding-bottom: 24rpx; }
.cb-nav-btn { width: 64rpx; height: 64rpx; display: flex; align-items: center; justify-content: center; border-radius: 999rpx; }
.cb-top-title { font-size: 34rpx; font-weight: 700; color: #fff; }
.cb-summary { display: flex; align-items: center; gap: 20rpx; background: rgba(255,255,255,0.12); border-radius: 24rpx; padding: 24rpx; }
.cb-summary-icon { width: 88rpx; height: 88rpx; border-radius: 20rpx; flex-shrink: 0; background: rgba(255,255,255,0.2); }
.cb-summary-main { flex: 1; min-width: 0; }
.cb-summary-name-row { display: flex; align-items: center; gap: 12rpx; }
.cb-summary-name { font-size: 30rpx; font-weight: 700; color: #fff; max-width: 280rpx; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.cb-summary-badge { font-size: 18rpx; padding: 2rpx 12rpx; border-radius: 8rpx; flex-shrink: 0; }
.cb-summary-badge.gold { background: #C9A96E; color: #fff; }
.cb-summary-badge.ghost { background: rgba(255,255,255,0.2); color: #fff; }
.cb-summary-desc { display: block; font-size: 24rpx; color: rgba(255,255,255,0.7); overflow: hidden; white-space: nowrap; text-overflow: ellipsis; margin-top: 6rpx; }
.cb-summary-total { text-align: center; flex-shrink: 0; }
.cb-summary-total-n { display: block; font-size: 36rpx; font-weight: 700; color: #fff; }
.cb-summary-total-l { display: block; font-size: 20rpx; color: rgba(255,255,255,0.7); }
/* body */
.cb-body { flex: 1; overflow: hidden; }
/* 搜索筛选 */
.cb-filter { background: #FAF8F5; border-bottom: 2rpx solid #E8E4DE; padding: 24rpx 32rpx; }
.cb-search-row { display: flex; gap: 16rpx; margin-bottom: 20rpx; }
.cb-search { flex: 1; display: flex; align-items: center; gap: 12rpx; padding: 0 24rpx; height: 72rpx; background: #fff; border: 2rpx solid #E8E4DE; border-radius: 16rpx; }
.cb-search-input { flex: 1; font-size: 26rpx; color: #333; }
.cb-ph { color: #b5aea3; }
.cb-search-btn { padding: 0 36rpx; display: flex; align-items: center; background: #C41E3A; border-radius: 16rpx; }
.cb-search-btn-t { font-size: 26rpx; color: #fff; font-weight: 500; }
.cb-sorts { display: flex; gap: 16rpx; }
.cb-sort { padding: 10rpx 28rpx; border-radius: 12rpx; border: 2rpx solid #E8E4DE; background: #fff; }
.cb-sort.on { background: #C41E3A; border-color: #C41E3A; }
.cb-sort-t { font-size: 24rpx; color: #666; }
.cb-sort-t.on { color: #fff; }
/* 创建入口 */
.cb-create-wrap { padding: 24rpx 32rpx 0; }
.cb-create { display: flex; align-items: center; gap: 20rpx; padding: 28rpx; border-radius: 24rpx; border: 2rpx dashed #C9A96E; background: rgba(201,169,110,0.08); }
.cb-create-icon { width: 80rpx; height: 80rpx; border-radius: 20rpx; background: linear-gradient(135deg, #C9A96E, #C41E3A); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.cb-create-main { flex: 1; }
.cb-create-title { display: block; font-size: 28rpx; font-weight: 500; color: #333; }
.cb-create-desc { display: block; font-size: 24rpx; color: #999; margin-top: 4rpx; }
/* 网格 */
.cb-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20rpx; padding: 24rpx 32rpx 48rpx; }
.cb-card { background: #fff; border-radius: 24rpx; border: 2rpx solid #E8E4DE; overflow: hidden; }
.cb-card-head { position: relative; padding: 28rpx 24rpx 12rpx; display: flex; flex-direction: column; align-items: center; }
.cb-card-tags { position: absolute; top: 16rpx; right: 16rpx; display: flex; flex-direction: column; gap: 8rpx; align-items: flex-end; }
.cb-tag-badge { display: flex; align-items: center; gap: 4rpx; padding: 2rpx 12rpx; border-radius: 8rpx; }
.cb-tag-badge.red { background: #C41E3A; }
.cb-tag-badge.gold { background: #C9A96E; }
.cb-tag-badge.green { background: #22c55e; }
.cb-tag-badge-t { font-size: 18rpx; color: #fff; }
.cb-card-avatar { width: 96rpx; height: 96rpx; border-radius: 20rpx; margin-bottom: 16rpx; background: #f0ebe3; border: 4rpx solid rgba(201,169,110,0.3); }
.cb-card-name { font-size: 28rpx; font-weight: 700; color: #333; text-align: center; max-width: 100%; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.cb-card-desc { display: block; padding: 0 24rpx; font-size: 22rpx; color: #999; line-height: 1.4; height: 62rpx; overflow: hidden; }
.cb-card-taglist { display: flex; flex-wrap: wrap; gap: 8rpx; padding: 12rpx 24rpx; }
.cb-card-tag { font-size: 20rpx; padding: 2rpx 12rpx; background: #FAF8F5; color: #666; border-radius: 8rpx; }
.cb-card-foot { display: flex; align-items: center; gap: 12rpx; padding: 16rpx 20rpx; border-top: 2rpx solid #F0EDE8; }
.cb-card-stat { display: flex; align-items: center; gap: 4rpx; }
.cb-card-stat-t { font-size: 20rpx; color: #999; }
.cb-card-price { margin-left: auto; font-size: 20rpx; font-weight: 500; color: #C41E3A; }
.cb-card-free { margin-left: auto; font-size: 20rpx; color: #16a34a; }
.cb-card-creator { display: flex; align-items: center; gap: 10rpx; padding: 14rpx 20rpx; background: #FAF8F5; }
.cb-card-creator-avatar { width: 36rpx; height: 36rpx; border-radius: 999rpx; flex-shrink: 0; background: #f0ebe3; }
.cb-card-creator-name { font-size: 20rpx; color: #999; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
</style>
