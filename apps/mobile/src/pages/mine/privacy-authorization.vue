<template>
  <view class="page">
    <view class="header">
      <text
        class="back-btn"
        @click="goBack"
      >
        ‹
      </text>
      <text class="header-title">
        隐私授权管理
      </text>
      <view style="width:60rpx" />
    </view>

    <scroll-view
      scroll-y
      class="content-scroll"
    >
      <view class="section">
        <text class="section-title">
          系统权限
        </text>
        <text class="section-desc">
          管理应用所需的系统权限，关闭后相应功能将不可用
        </text>

        <view
          v-for="p in perms"
          :key="p.key"
          class="perm-item"
        >
          <view class="perm-info">
            <view
              class="perm-icon-wrap"
              :style="{ background: p.bgColor }"
            >
              <text>{{ p.icon }}</text>
            </view>
            <view class="perm-text">
              <text class="perm-name">
                {{ p.name }}
              </text>
              <text class="perm-desc">
                {{ p.desc }}
              </text>
            </view>
          </view>
          <switch
            :checked="p.enabled"
            color="#C41E3A"
            @change="togglePerm(p, $event)"
          />
        </view>
      </view>

      <view class="section">
        <text class="section-title">
          个性化推荐
        </text>
        <text class="section-desc">
          开启后，我们将基于您的兴趣为您推荐内容
        </text>

        <view class="perm-item">
          <view class="perm-info">
            <view
              class="perm-icon-wrap"
              style="background:#fce4ec"
            >
              <text>🎯</text>
            </view>
            <view class="perm-text">
              <text class="perm-name">
                个性化推荐
              </text>
              <text class="perm-desc">
                基于浏览记录推荐内容
              </text>
            </view>
          </view>
          <switch
            :checked="personalized"
            color="#C41E3A"
            @change="personalized = $event.detail.value"
          />
        </view>
      </view>

      <view class="section">
        <text class="section-title">
          隐私协议
        </text>
        <text class="section-desc">
          查阅我们的隐私相关文档
        </text>

        <view class="policy-links">
          <view
            class="policy-item"
            @click="goDoc('privacy-policy')"
          >
            <text class="policy-name">
              隐私政策
            </text>
            <text class="policy-arrow">
              ›
            </text>
          </view>
          <view
            class="policy-item"
            @click="goDoc('user-agreement')"
          >
            <text class="policy-name">
              用户协议
            </text>
            <text class="policy-arrow">
              ›
            </text>
          </view>
          <view
            class="policy-item"
            @click="goDoc('child-privacy')"
          >
            <text class="policy-name">
              儿童隐私保护
            </text>
            <text class="policy-arrow">
              ›
            </text>
          </view>
          <view
            class="policy-item"
            @click="goDoc('third-party-sdk')"
          >
            <text class="policy-name">
              第三方SDK列表
            </text>
            <text class="policy-arrow">
              ›
            </text>
          </view>
        </view>
      </view>

      <view class="data-actions">
        <text
          class="data-action"
          @click="exportData"
        >
          📥 导出个人数据
        </text>
        <text
          class="data-action danger"
          @click="deleteAccount"
        >
          🗑 注销账号
        </text>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const personalized = ref(true)

const perms = ref([
  { key: 'location', name: '位置信息', desc: '用于同城功能和服务推荐', icon: '📍', bgColor: '#e3f2fd', enabled: true },
  { key: 'camera', name: '相机', desc: '用于拍照上传和扫码', icon: '📷', bgColor: '#fce4ec', enabled: true },
  { key: 'album', name: '相册', desc: '用于选择图片和视频', icon: '🖼', bgColor: '#e8f5e9', enabled: true },
  { key: 'notification', name: '通知推送', desc: '接收消息提醒和通知', icon: '🔔', bgColor: '#fff3e0', enabled: true },
  { key: 'contacts', name: '通讯录', desc: '用于邀请好友和推荐', icon: '👥', bgColor: '#f3e5f5', enabled: false },
  { key: 'microphone', name: '麦克风', desc: '用于语音输入和录制', icon: '🎤', bgColor: '#e0f7fa', enabled: false },
])

function togglePerm(p: any, e: any) { p.enabled = e.detail.value }

function goDoc(type: string) {
  uni.navigateTo({ url: `/pages/common/legal-doc?type=${type}&title=${encodeURIComponent(type)}` })
}

function exportData() {
  uni.showToast({ title: '已提交数据导出申请', icon: 'none' })
}

function deleteAccount() {
  uni.showModal({ title: '警告', content: '注销账号后所有数据将被清除且不可恢复，确定要注销吗？', success: (r) => { if (r.confirm) uni.navigateTo({ url: '/pages/mine/delete-account' }) } })
}

function goBack() { uni.navigateBack() }
</script>

<style scoped>
.page { background: #F5F0E8; min-height: 100vh; }
.header { display: flex; align-items: center; justify-content: space-between; padding: 20rpx 24rpx; background: #fff; border-bottom: 1rpx solid #E5E1DB; }
.back-btn { font-size: 36rpx; color: #2C2C2C; font-weight: bold; }
.header-title { font-size: 32rpx; font-weight: 600; color: #2C2C2C; }
.content-scroll { padding: 24rpx; }
.section { background: #fff; border-radius: 20rpx; padding: 32rpx; margin-bottom: 20rpx; }
.section-title { font-size: 28rpx; font-weight: 600; color: #2C2C2C; display: block; margin-bottom: 8rpx; }
.section-desc { font-size: 22rpx; color: #999; display: block; margin-bottom: 20rpx; }
.perm-item { display: flex; align-items: center; justify-content: space-between; padding: 16rpx 0; border-bottom: 1rpx solid #f5f5f5; }
.perm-item:last-child { border-bottom: none; }
.perm-info { display: flex; align-items: center; gap: 16rpx; flex: 1; }
.perm-icon-wrap { width: 56rpx; height: 56rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 28rpx; }
.perm-text { flex: 1; }
.perm-name { font-size: 26rpx; color: #2C2C2C; display: block; }
.perm-desc { font-size: 22rpx; color: #999; display: block; margin-top: 4rpx; }
.policy-links { }
.policy-item { display: flex; justify-content: space-between; align-items: center; padding: 20rpx 0; border-bottom: 1rpx solid #f5f5f5; }
.policy-item:last-child { border-bottom: none; }
.policy-name { font-size: 26rpx; color: #2C2C2C; }
.policy-arrow { font-size: 32rpx; color: #ccc; }
.data-actions { display: flex; gap: 16rpx; margin-top: 12rpx; }
.data-action { flex: 1; text-align: center; padding: 18rpx; background: #fff; border-radius: 16rpx; font-size: 24rpx; color: #666; }
.data-action.danger { color: #C41E3A; }
</style>
