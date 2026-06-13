<template>
  <view class="min-h-screen" style="background-color: #FAF8F5; padding-bottom: 160rpx;">
    <!-- 顶部导航 -->
    <view class="sticky top-0 z-50" style="background-color: #FFFFFF; border-bottom: 2rpx solid #E8E0D5;">
      <view class="flex items-center justify-between" style="padding: 0 32rpx; height: 96rpx;">
        <view @click="goBack" style="padding: 8rpx;">
          <text style="font-size: 36rpx; color: #2C2C2C;">←</text>
        </view>
        <text style="font-size: 30rpx; font-weight: 700; color: #2C2C2C;">创作者中心</text>
        <view @click="goTo('/pages/videos/creator/settings/index')" style="padding: 8rpx;">
          <text style="font-size: 32rpx; color: #999999;">⚙️</text>
        </view>
      </view>
    </view>

    <!-- 创作者信息卡片 -->
    <view style="background: linear-gradient(135deg, #C41E3A, rgba(196,30,58,0.8)); padding: 32rpx;">
      <view class="flex items-center" style="gap: 24rpx; margin-bottom: 32rpx;">
        <image src="https://api.dicebear.com/7.x/notionists/svg?seed=creator" mode="aspectFill"
          style="width: 112rpx; height: 112rpx; border-radius: 50%; border: 4rpx solid rgba(255,255,255,0.3);" />
        <view style="flex: 1;">
          <view class="flex items-center" style="gap: 16rpx;">
            <text style="color: #FFFFFF; font-size: 36rpx; font-weight: 700;">易学张老师</text>
            <text style="background-color: rgba(255,255,255,0.2); color: #FFFFFF; font-size: 18rpx; padding: 4rpx 12rpx; border-radius: 8rpx;">认证创作者</text>
          </view>
          <text style="color: rgba(255,255,255,0.7); font-size: 26rpx; margin-top: 4rpx; display: block;">
            {{ formatNumber(creatorStats.followers) }} 粉丝
          </text>
        </view>
        <view @click="goTo('/pages/videos/publish/index')"
          style="display: flex; align-items: center; gap: 8rpx; padding: 12rpx 24rpx; background-color: #FFFFFF; color: #C41E3A; border-radius: 999rpx; font-size: 26rpx; font-weight: 500;">
          <text style="font-size: 28rpx;">+</text>
          <text>发布</text>
        </view>
      </view>

      <!-- 核心数据 -->
      <view style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 16rpx; background-color: rgba(255,255,255,0.1); border-radius: 16rpx; padding: 24rpx;">
        <view style="text-align: center;">
          <text style="font-size: 36rpx; font-weight: 700; color: #FFFFFF; display: block;">{{ formatNumber(creatorStats.totalViews) }}</text>
          <text style="color: rgba(255,255,255,0.7); font-size: 20rpx; margin-top: 4rpx;">总播放</text>
        </view>
        <view style="text-align: center;">
          <text style="font-size: 36rpx; font-weight: 700; color: #FFFFFF; display: block;">{{ formatNumber(creatorStats.totalLikes) }}</text>
          <text style="color: rgba(255,255,255,0.7); font-size: 20rpx; margin-top: 4rpx;">总点赞</text>
        </view>
        <view style="text-align: center;">
          <text style="font-size: 36rpx; font-weight: 700; color: #FFFFFF; display: block;">{{ creatorStats.totalSales }}</text>
          <text style="color: rgba(255,255,255,0.7); font-size: 20rpx; margin-top: 4rpx;">带货订单</text>
        </view>
        <view style="text-align: center;">
          <text style="font-size: 36rpx; font-weight: 700; color: #FFFFFF; display: block;">¥{{ formatNumber(creatorStats.totalEarnings) }}</text>
          <text style="color: rgba(255,255,255,0.7); font-size: 20rpx; margin-top: 4rpx;">累计收益</text>
        </view>
      </view>
    </view>

    <!-- Tab 切换 -->
    <view class="sticky z-40" style="top: 96rpx; display: flex; align-items: center; border-bottom: 2rpx solid #E8E0D5; background-color: #FAF8F5;">
      <view v-for="tab in tabs" :key="tab.id" @click="activeTab = tab.id"
        :style="{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12rpx',
          padding: '24rpx 0',
          fontSize: '26rpx',
          fontWeight: 500,
          position: 'relative',
          color: activeTab === tab.id ? '#C41E3A' : '#999999'
        }">
        <text style="font-size: 28rpx;">{{ tab.icon }}</text>
        <text>{{ tab.label }}</text>
        <view v-if="activeTab === tab.id"
          style="position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 96rpx; height: 4rpx; background-color: #C41E3A; border-radius: 2rpx;" />
      </view>
    </view>

    <!-- ====== 数据概览 ====== -->
    <view v-if="activeTab === 'overview'" style="padding: 32rpx;">
      <!-- 数据趋势 -->
      <view style="background-color: #FFFFFF; border-radius: 16rpx; padding: 32rpx; margin-bottom: 32rpx;">
        <view class="flex items-center justify-between" style="margin-bottom: 24rpx;">
          <text style="font-size: 28rpx; font-weight: 600; color: #2C2C2C;">数据趋势</text>
          <text style="font-size: 22rpx; color: #999999;">较上周</text>
        </view>
        <view style="display: grid; grid-template-columns: 1fr 1fr; gap: 32rpx;">
          <view v-for="(item, i) in trendItems" :key="i" class="flex items-center justify-between" style="padding: 24rpx; background-color: rgba(245,241,235,0.5); border-radius: 12rpx;">
            <view>
              <text style="font-size: 22rpx; color: #999999; display: block;">{{ item.label }}</text>
              <text style="font-size: 36rpx; font-weight: 700; color: #2C2C2C; display: block;">{{ item.value }}</text>
            </view>
            <view class="flex items-center" :style="{ gap: '4rpx', fontSize: '26rpx', fontWeight: 500, color: item.trend > 0 ? '#22C55E' : '#DC2626' }">
              <text style="font-size: 24rpx;">{{ item.trend > 0 ? '📈' : '📉' }}</text>
              <text>{{ Math.abs(item.trend) }}%</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 带货数据 -->
      <view style="background-color: #FFFFFF; border-radius: 16rpx; padding: 32rpx; margin-bottom: 32rpx;">
        <view class="flex items-center justify-between" style="margin-bottom: 24rpx;">
          <text style="font-size: 28rpx; font-weight: 600; color: #2C2C2C;">带货数据</text>
          <view @click="goTo('/pages/videos/creator/sales/index')" class="flex items-center" style="font-size: 22rpx; color: #C41E3A;">
            <text>查看详情</text>
            <text style="font-size: 24rpx;">›</text>
          </view>
        </view>
        <view style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24rpx;">
          <view style="text-align: center; padding: 24rpx; background-color: rgba(196,30,58,0.05); border-radius: 12rpx;">
            <text style="font-size: 40rpx; display: block; margin-bottom: 8rpx;">️</text>
            <text style="font-size: 36rpx; font-weight: 700; color: #2C2C2C; display: block;">{{ creatorStats.totalSales }}</text>
            <text style="font-size: 20rpx; color: #999999;">成交订单</text>
          </view>
          <view style="text-align: center; padding: 24rpx; background-color: rgba(201,169,110,0.05); border-radius: 12rpx;">
            <text style="font-size: 40rpx; display: block; margin-bottom: 8rpx;"></text>
            <text style="font-size: 36rpx; font-weight: 700; color: #2C2C2C; display: block;">¥{{ formatNumber(creatorStats.totalGMV) }}</text>
            <text style="font-size: 20rpx; color: #999999;">带货GMV</text>
          </view>
          <view style="text-align: center; padding: 24rpx; background-color: rgba(34,197,94,0.05); border-radius: 12rpx;">
            <text style="font-size: 40rpx; display: block; margin-bottom: 8rpx;">📈</text>
            <text style="font-size: 36rpx; font-weight: 700; color: #2C2C2C; display: block;">{{ creatorStats.conversionRate }}%</text>
            <text style="font-size: 20rpx; color: #999999;">转化率</text>
          </view>
        </view>
      </view>

      <!-- 热门作品 -->
      <view style="background-color: #FFFFFF; border-radius: 16rpx; padding: 32rpx;">
        <view class="flex items-center justify-between" style="margin-bottom: 24rpx;">
          <text style="font-size: 28rpx; font-weight: 600; color: #2C2C2C;">热门作品</text>
          <view @click="activeTab = 'videos'" class="flex items-center" style="font-size: 22rpx; color: #C41E3A;">
            <text>查看全部</text>
            <text style="font-size: 24rpx;">›</text>
          </view>
        </view>
        <view v-for="(video, index) in myVideos.slice(0, 2)" :key="video.id" @click="goTo('/pages/videos/id-detail/index?id=' + video.id)"
          class="flex" style="gap: 24rpx; padding: 16rpx; border-radius: 12rpx; margin-bottom: 16rpx;">
          <view style="position: relative; width: 160rpx; height: 224rpx; border-radius: 16rpx; overflow: hidden; flex-shrink: 0; background-color: #F5F1EB;">
            <image :src="video.cover" mode="aspectFill" style="width: 100%; height: 100%;" v-if="video.cover" />
            <view style="position: absolute; inset: 0; background-color: rgba(0,0,0,0.2); display: flex; align-items: center; justify-content: center;">
              <text style="font-size: 48rpx; color: #FFFFFF;">▶</text>
            </view>
            <text style="position: absolute; top: 8rpx; left: 8rpx; background-color: rgba(0,0,0,0.6); color: #FFFFFF; font-size: 16rpx; padding: 4rpx 8rpx; border-radius: 4rpx;">#{{ index + 1 }}</text>
          </view>
          <view style="flex: 1; min-width: 0; padding: 8rpx 0;">
            <text style="font-size: 26rpx; font-weight: 500; color: #2C2C2C; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">
              {{ video.title }}
            </text>
            <view class="flex items-center" style="gap: 24rpx; margin-top: 16rpx; font-size: 22rpx; color: #999999;">
              <text class="flex items-center" style="gap: 4rpx;"> {{ formatNumber(video.views) }}</text>
              <text class="flex items-center" style="gap: 4rpx;"> {{ formatNumber(video.likes) }}</text>
            </view>
            <view v-if="video.products.length > 0" class="flex items-center" style="gap: 8rpx; margin-top: 16rpx;">
              <text style="font-size: 22rpx; color: #C41E3A; font-weight: 500;">
                ️ {{ video.sales }}单 · ¥{{ formatNumber(video.gmv) }}
              </text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- ====== 我的作品 ====== -->
    <view v-if="activeTab === 'videos'" style="padding: 32rpx;">
      <view v-for="video in myVideos" :key="video.id" style="background-color: #FFFFFF; border-radius: 16rpx; overflow: hidden; margin-bottom: 24rpx;">
        <view class="flex" style="gap: 24rpx; padding: 24rpx;">
          <view style="position: relative; width: 192rpx; height: 256rpx; border-radius: 16rpx; overflow: hidden; flex-shrink: 0; background-color: #F5F1EB;">
            <image :src="video.cover" mode="aspectFill" style="width: 100%; height: 100%;" v-if="video.cover" />
            <view style="position: absolute; inset: 0; background-color: rgba(0,0,0,0.2); display: flex; align-items: center; justify-content: center;">
              <text style="font-size: 48rpx; color: #FFFFFF;">▶</text>
            </view>
          </view>
          <view style="flex: 1; min-width: 0;">
            <text style="font-size: 26rpx; font-weight: 500; color: #2C2C2C; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">
              {{ video.title }}
            </text>
            <text style="font-size: 22rpx; color: #999999; margin-top: 8rpx; display: block;">{{ video.publishTime }}</text>
            <view style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 16rpx; margin-top: 24rpx; font-size: 22rpx; color: #999999;">
              <view style="text-align: center;">
                <text style="font-weight: 500; color: #2C2C2C; display: block;">{{ formatNumber(video.views) }}</text>
                <text>播放</text>
              </view>
              <view style="text-align: center;">
                <text style="font-weight: 500; color: #2C2C2C; display: block;">{{ formatNumber(video.likes) }}</text>
                <text>点赞</text>
              </view>
              <view style="text-align: center;">
                <text style="font-weight: 500; color: #2C2C2C; display: block;">{{ video.comments }}</text>
                <text>评论</text>
              </view>
              <view style="text-align: center;">
                <text style="font-weight: 500; color: #2C2C2C; display: block;">{{ video.shares }}</text>
                <text>分享</text>
              </view>
            </view>
            <view v-if="video.products.length > 0" class="flex items-center justify-between" style="margin-top: 24rpx; padding-top: 24rpx; border-top: 2rpx solid #E8E0D5;">
              <view class="flex items-center" style="gap: 8rpx;">
                <text style="font-size: 28rpx;">️</text>
                <text style="font-size: 22rpx; color: #999999;">{{ video.products.length }}件商品</text>
              </view>
              <view style="font-size: 22rpx;">
                <text style="color: #C41E3A; font-weight: 500;">{{ video.sales }}单</text>
                <text style="color: #999999;"> · ¥{{ formatNumber(video.gmv) }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- ====== 商品管理 ====== -->
    <view v-if="activeTab === 'products'" style="padding: 32rpx;">
      <!-- 商品库头部 -->
      <view style="background-color: #FFFFFF; border-radius: 16rpx; padding: 32rpx; margin-bottom: 32rpx;">
        <view class="flex items-center justify-between">
          <view>
            <text style="font-size: 28rpx; font-weight: 600; color: #2C2C2C;">我的商品库</text>
            <text style="font-size: 22rpx; color: #999999; margin-top: 4rpx; display: block;">已添加 {{ productLibrary.length }} 件商品</text>
          </view>
          <view @click="goTo('/pages/videos/creator/products/add/index')"
            style="display: flex; align-items: center; gap: 8rpx; padding: 12rpx 24rpx; background-color: #C41E3A; color: #FFFFFF; border-radius: 999rpx; font-size: 26rpx; font-weight: 500;">
            <text style="font-size: 28rpx;">+</text>
            <text>添加商品</text>
          </view>
        </view>
      </view>

      <!-- 商品列表 -->
      <view v-for="product in productLibrary" :key="product.id" style="background-color: #FFFFFF; border-radius: 16rpx; padding: 24rpx; margin-bottom: 24rpx;">
        <view class="flex" style="gap: 24rpx;">
          <image :src="product.image" mode="aspectFill" v-if="product.image"
            style="width: 128rpx; height: 128rpx; border-radius: 16rpx; flex-shrink: 0; background-color: #F5F1EB;" />
          <view v-else style="width: 128rpx; height: 128rpx; border-radius: 16rpx; flex-shrink: 0; background-color: #F5F1EB; display: flex; align-items: center; justify-content: center;">
            <text style="font-size: 48rpx;">️</text>
          </view>
          <view style="flex: 1; min-width: 0;">
            <text style="font-size: 26rpx; font-weight: 500; color: #2C2C2C; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: block;">
              {{ product.name }}
            </text>
            <view class="flex items-center" style="gap: 16rpx; margin-top: 8rpx;">
              <text style="font-size: 32rpx; font-weight: 700; color: #C41E3A;">¥{{ product.price }}</text>
              <text style="font-size: 18rpx; color: #22C55E; background-color: rgba(34,197,94,0.1); padding: 4rpx 12rpx; border-radius: 8rpx;">{{ product.commission }}%佣金</text>
            </view>
            <view class="flex items-center" style="gap: 32rpx; margin-top: 16rpx; font-size: 22rpx; color: #999999;">
              <text>销量 {{ product.sales }}</text>
              <text>库存 {{ product.stock }}</text>
            </view>
          </view>
          <view style="display: flex; flex-direction: column; justify-content: center;">
            <view @click="goTo('/pages/videos/publish/index')" style="padding: 8rpx 24rpx; background-color: rgba(196,30,58,0.1); color: #C41E3A; border-radius: 12rpx; font-size: 22rpx; font-weight: 500;">去带货</view>
          </view>
        </view>
      </view>
    </view>

    <!-- ====== 收益中心 ====== -->
    <view v-if="activeTab === 'earnings'" style="padding: 32rpx;">
      <!-- 收益概览 -->
      <view style="background: linear-gradient(135deg, rgba(201,169,110,0.1), rgba(201,169,110,0.05)); border-radius: 16rpx; padding: 32rpx; margin-bottom: 32rpx;">
        <view class="flex items-center justify-between" style="margin-bottom: 32rpx;">
          <view>
            <text style="font-size: 26rpx; color: #999999;">累计收益 (元)</text>
            <text style="font-size: 60rpx; font-weight: 700; color: #2C2C2C; margin-top: 8rpx; display: block;">
              ¥{{ creatorStats.totalEarnings.toFixed(2) }}
            </text>
          </view>
          <view @click="goTo('/pages/videos/creator/withdraw/index')"
            style="padding: 16rpx 32rpx; background-color: #C41E3A; color: #FFFFFF; border-radius: 999rpx; font-size: 26rpx; font-weight: 500;">
            提现
          </view>
        </view>
        <view style="display: grid; grid-template-columns: 1fr 1fr; gap: 24rpx;">
          <view style="background-color: rgba(255,255,255,0.5); border-radius: 12rpx; padding: 24rpx;">
            <text style="font-size: 22rpx; color: #999999;">待结算</text>
            <text style="font-size: 36rpx; font-weight: 700; color: #2C2C2C; margin-top: 4rpx; display: block;">¥{{ creatorStats.pendingEarnings.toFixed(2) }}</text>
          </view>
          <view style="background-color: rgba(255,255,255,0.5); border-radius: 12rpx; padding: 24rpx;">
            <text style="font-size: 22rpx; color: #999999;">已提现</text>
            <text style="font-size: 36rpx; font-weight: 700; color: #2C2C2C; margin-top: 4rpx; display: block;">¥{{ creatorStats.withdrawnEarnings.toFixed(2) }}</text>
          </view>
        </view>
      </view>

      <!-- 收益明细 -->
      <view style="background-color: #FFFFFF; border-radius: 16rpx; padding: 32rpx; margin-bottom: 32rpx;">
        <view class="flex items-center justify-between" style="margin-bottom: 24rpx;">
          <text style="font-size: 28rpx; font-weight: 600; color: #2C2C2C;">收益明细</text>
          <view @click="goTo('/pages/videos/creator/earnings/history/index')" class="flex items-center" style="font-size: 22rpx; color: #C41E3A;">
            <text>全部记录</text>
            <text style="font-size: 24rpx;">›</text>
          </view>
        </view>
        <view v-for="(item, index) in earningsRecords" :key="index"
          class="flex items-center justify-between" style="padding: 16rpx 0; border-bottom: 2rpx solid #E8E0D5;">
          <view>
            <text style="font-size: 26rpx; font-weight: 500; color: #2C2C2C; display: block;">{{ item.type }}</text>
            <text style="font-size: 22rpx; color: #999999; margin-top: 4rpx;">{{ item.product }} · {{ item.time }}</text>
          </view>
          <text style="font-size: 26rpx; font-weight: 500; color: #22C55E;">+¥{{ item.amount.toFixed(2) }}</text>
        </view>
      </view>

      <!-- 收益规则 -->
      <view style="background-color: #FFFFFF; border-radius: 16rpx; padding: 32rpx;">
        <text style="font-size: 28rpx; font-weight: 600; color: #2C2C2C; margin-bottom: 16rpx; display: block;">收益规则</text>
        <view style="font-size: 22rpx; color: #999999;">
          <text style="display: block; margin-bottom: 8rpx;">1. 带货佣金：按商品设定的佣金比例结算</text>
          <text style="display: block; margin-bottom: 8rpx;">2. 结算周期：订单确认收货后7天自动结算</text>
          <text style="display: block; margin-bottom: 8rpx;">3. 提现门槛：满100元可申请提现</text>
          <text style="display: block;">4. 到账时间：提现申请后1-3个工作日到账</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const tabs = [
  { id: 'overview', label: '数据概览', icon: '📊' },
  { id: 'videos', label: '我的作品', icon: '' },
  { id: 'products', label: '商品管理', icon: '📦' },
  { id: 'earnings', label: '收益中心', icon: '' },
]

const activeTab = ref<'overview' | 'videos' | 'products' | 'earnings'>('overview')

const creatorStats = {
  totalViews: 1256800,
  totalLikes: 89600,
  totalComments: 12800,
  totalShares: 5680,
  followers: 28900,
  totalEarnings: 12680.50,
  pendingEarnings: 2350.00,
  withdrawnEarnings: 10330.50,
  totalSales: 568,
  totalGMV: 45680,
  commission: 4568,
  conversionRate: 3.2,
  viewsTrend: 12.5,
  likesTrend: 8.3,
  followersTrend: 15.2,
  salesTrend: -2.5,
}

const trendItems = [
  { label: '播放量', value: formatNumber(1256800), trend: 12.5 },
  { label: '新增粉丝', value: '+' + formatNumber(Math.floor(28900 * 15.2 / 100)), trend: 15.2 },
  { label: '互动量', value: formatNumber(89600 + 12800), trend: 8.3 },
  { label: '带货销量', value: '568单', trend: -2.5 },
]

const myVideos = [
  {
    id: '1',
    title: '八字命理入门：教你看懂自己的命盘',
    cover: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=300&fit=crop',
    views: 128000, likes: 8960, comments: 856, shares: 234,
    sales: 128, gmv: 8704, status: 'published', publishTime: '2024-01-15',
    products: [{ id: 'p1', name: '八字入门书籍', price: 68 }],
  },
  {
    id: '2',
    title: '风水布局：客厅财位怎么找？',
    cover: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=200&h=300&fit=crop',
    views: 235000, likes: 15600, comments: 1280, shares: 567,
    sales: 256, gmv: 25600, status: 'published', publishTime: '2024-01-12',
    products: [{ id: 'p2', name: '招财貔貅', price: 298 }, { id: 'p3', name: '五帝钱', price: 128 }],
  },
  {
    id: '3',
    title: '姓名学：名字里这几个字最旺运势',
    cover: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=200&h=300&fit=crop',
    views: 456000, likes: 32800, comments: 3420, shares: 1890,
    sales: 184, gmv: 11376, status: 'published', publishTime: '2024-01-10',
    products: [{ id: 'p4', name: '姓名学全解', price: 88 }],
  },
]

const productLibrary = [
  { id: 'p1', name: '八字命理学入门书籍', price: 68, sales: 128, commission: 10, stock: 500, image: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=100&h=100&fit=crop' },
  { id: 'p2', name: '招财貔貅摆件', price: 298, sales: 256, commission: 15, stock: 200, image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=100&h=100&fit=crop' },
  { id: 'p3', name: '五帝钱挂件', price: 128, sales: 89, commission: 12, stock: 350, image: 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=100&h=100&fit=crop' },
  { id: 'p4', name: '姓名学全解', price: 88, sales: 184, commission: 10, stock: 800, image: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=100&h=100&fit=crop' },
]

const earningsRecords = [
  { type: '带货佣金', amount: 128.50, time: '今天 14:30', product: '八字入门书籍' },
  { type: '带货佣金', amount: 298.00, time: '今天 11:20', product: '招财貔貅摆件' },
  { type: '带货佣金', amount: 88.00, time: '昨天 16:45', product: '姓名学全解' },
  { type: '带货佣金', amount: 128.00, time: '昨天 09:15', product: '五帝钱挂件' },
]

function formatNumber(num: number): string {
  if (num >= 10000) return (num / 10000).toFixed(1) + '万'
  return num.toLocaleString()
}

function goBack() {
  uni.navigateBack()
}

function goTo(url: string) {
  uni.navigateTo({ url })
}
</script>

<style scoped>
.flex { display: flex; }
.items-center { align-items: center; }
.justify-between { justify-content: space-between; }
</style>
