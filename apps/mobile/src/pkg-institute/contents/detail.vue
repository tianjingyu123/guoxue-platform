<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-bar">
        <view class="nav-back" @tap="goBack">
          <app-icon name="chevron-left" :size="22" color="#1a1a1a" />
        </view>
        <text class="nav-title">大师讲堂</text>
        <view class="nav-placeholder" />
      </view>
    </view>

    <scroll-view scroll-y class="scroll" :style="{ paddingTop: navHeight + 'px', paddingBottom: detail && !detail.purchased ? '80px' : '0' }">
      <!-- 三态 -->
      <view v-if="loading" class="state-box">
        <view class="spinner" />
        <text class="state-text">加载中…</text>
      </view>
      <view v-else-if="errMsg" class="state-box">
        <app-icon name="alert-circle" :size="40" color="#d1d5db" />
        <text class="state-text">{{ errMsg }}</text>
        <view class="retry-btn" @tap="load"><text class="retry-text">重试</text></view>
      </view>

      <template v-else-if="detail">
        <!-- 头部信息 -->
        <view class="header">
          <view class="header-tags">
            <text class="type-tag" :style="{ color: contentTypeColor[detail.contentType].color, background: contentTypeColor[detail.contentType].bg }">{{ contentTypeLabel[detail.contentType] }}</text>
            <view v-if="detail.purchased && detail.price > 0" class="owned-tag">
              <app-icon name="badge-check" :size="13" color="#16a34a" />
              <text class="owned-text">已购</text>
            </view>
          </view>
          <text class="title">{{ detail.title }}</text>
          <view class="meta-row">
            <view v-if="detail.author" class="author">
              <image lazy-load v-if="detail.author.avatar" :src="detail.author.avatar" class="author-avatar" mode="aspectFill" />
              <view v-else class="author-avatar-ph"><app-icon name="user" :size="14" color="#9ca3af" /></view>
              <text class="author-name">{{ detail.author.nickname || '研究院' }}</text>
            </view>
            <text class="meta-text">{{ detail.purchaseCount }} 人已学 · {{ fmtDate(detail.createdAt) }}</text>
          </view>
        </view>

        <!-- 正文区 -->
        <view class="body">
          <!-- VIDEO：已购/免费播 content 里的 URL -->
          <template v-if="detail.contentType === 'VIDEO'">
            <video v-if="detail.purchased && detail.content" :src="detail.content" class="video-player" controls />
            <view v-else class="locked-media">
              <app-icon name="video" :size="40" color="#d1d5db" />
              <text class="locked-media-text">购买后即可观看完整视频</text>
            </view>
            <text v-if="detail.summary" class="paragraph">{{ detail.summary }}</text>
          </template>

          <!-- DOCUMENT：已购给预览/复制链接 -->
          <template v-else-if="detail.contentType === 'DOCUMENT'">
            <text v-if="detail.summary" class="paragraph">{{ detail.summary }}</text>
            <view v-if="detail.purchased && detail.content" class="doc-actions">
              <view class="doc-btn" @tap="openDocument"><app-icon name="file" :size="16" color="#fff" /><text class="doc-btn-text">查看文档</text></view>
              <view class="doc-btn doc-btn-plain" @tap="copyDocLink"><text class="doc-btn-plain-text">复制链接</text></view>
            </view>
            <view v-else class="locked-media">
              <app-icon name="file" :size="40" color="#d1d5db" />
              <text class="locked-media-text">购买后即可查看/下载完整文档</text>
            </view>
          </template>

          <!-- ARTICLE：纯文本分段渲染；未购为前 200 字试读 + 虚化提示 -->
          <template v-else>
            <text v-for="(p, i) in paragraphs" :key="i" class="paragraph">{{ p }}</text>
            <view v-if="!detail.purchased" class="fade-mask">
              <view class="fade-gradient" />
              <view class="fade-tip">
                <app-icon name="lock" :size="16" color="#c41e3a" />
                <text class="fade-tip-text">试读结束，购买后阅读全文</text>
              </view>
            </view>
          </template>
        </view>

        <view class="bottom-safe" />
      </template>
    </scroll-view>

    <!-- 底部购买栏（未购且收费） -->
    <view v-if="detail && !detail.purchased" class="buy-bar">
      <view class="buy-info">
        <text class="buy-price">{{ detail.price }} 币</text>
        <text class="buy-note">购买后永久阅读</text>
      </view>
      <view class="buy-btn" :class="{ 'buy-btn-disabled': submitting }" @tap="onPurchase">
        <text class="buy-btn-text">{{ submitting ? '购买中…' : '立即购买' }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo } from '@/utils/router'
import { instituteApi, contentTypeLabel, contentTypeColor, fmtDate, type InstituteContentDetail } from '@/lib/institute-data'

const statusBarHeight = ref(0)
const navHeight = ref(44)
const sys = uni.getSystemInfoSync()
statusBarHeight.value = sys.statusBarHeight || 0
navHeight.value = (sys.statusBarHeight || 0) + 44

const contentId = ref('')
const loading = ref(true)
const errMsg = ref('')
const detail = ref<InstituteContentDetail | null>(null)
const submitting = ref(false)

/** ARTICLE 纯文本按空行/换行分段渲染 */
const paragraphs = computed(() => {
  if (!detail.value || detail.value.contentType !== 'ARTICLE') return []
  return detail.value.content.split(/\n+/).map((s) => s.trim()).filter(Boolean)
})

async function load() {
  if (!contentId.value) {
    loading.value = false
    errMsg.value = '缺少内容参数'
    return
  }
  loading.value = true
  errMsg.value = ''
  try {
    detail.value = await instituteApi.getContent(contentId.value)
  } catch (e) {
    errMsg.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

onLoad((options) => {
  contentId.value = (options as Record<string, string>)?.id || ''
  load()
})

async function onPurchase() {
  if (submitting.value || !detail.value) return
  submitting.value = true
  try {
    await instituteApi.purchaseContent(detail.value.id)
    uni.showToast({ title: '购买成功', icon: 'success' })
    await load() // 购买成功即刷详情，解锁全文
  } catch (e) {
    const msg = (e as Error)?.message || '购买失败'
    if (msg.includes('余额不足')) {
      // 余额不足引导充值
      uni.showModal({
        title: '余额不足',
        content: msg,
        confirmText: '去充值',
        success: (res) => { if (res.confirm) navigateTo('/wallet/recharge') },
      })
    } else if (msg.includes('已购买')) {
      // 已购（可能他端已买）：直接刷详情解锁
      uni.showToast({ title: '已拥有该内容', icon: 'none' })
      await load()
    } else {
      uni.showToast({ title: msg, icon: 'none' })
    }
  } finally {
    submitting.value = false
  }
}

function openDocument() {
  const url = detail.value?.content
  if (!url) return
  // #ifdef H5
  window.open(url, '_blank')
  // #endif
  // #ifndef H5
  uni.downloadFile({
    url,
    success: (res) => {
      uni.openDocument({ filePath: res.tempFilePath, showMenu: true, fail: () => copyDocLink() })
    },
    fail: () => copyDocLink(),
  })
  // #endif
}

function copyDocLink() {
  const url = detail.value?.content
  if (!url) return
  uni.setClipboardData({ data: url, success: () => uni.showToast({ title: '链接已复制', icon: 'none' }) })
}
</script>

<style scoped>
.page { min-height: 100vh; background: #fff; }
.nav { position: fixed; top: 0; left: 0; right: 0; z-index: 20; background: rgba(255,255,255,0.95); backdrop-filter: blur(8px); border-bottom: 1px solid #ececec; }
.nav-bar { height: 44px; display: flex; align-items: center; padding: 0 12px; }
.nav-back { width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; margin: 0 -6px 0 -10px; } /* 触控热区≥44px：容器扩大+负margin保持视觉位置 */
.nav-title { flex: 1; text-align: center; font-size: 17px; font-weight: 600; color: #1a1a1a; }
.nav-placeholder { width: 32px; }
.scroll { height: 100vh; box-sizing: border-box; }

.header { padding: 20px 16px 12px; border-bottom: 1px solid #f3f4f6; }
.header-tags { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
.type-tag { font-size: 11px; padding: 2px 8px; border-radius: 4px; }
.owned-tag { display: flex; align-items: center; gap: 3px; background: #f0fdf4; border-radius: 4px; padding: 2px 8px; }
.owned-text { font-size: 12px; color: #16a34a; }
.title { display: block; font-size: 20px; font-weight: 700; color: #1a1a1a; line-height: 1.4; }
.meta-row { display: flex; align-items: center; justify-content: space-between; margin-top: 12px; }
.author { display: flex; align-items: center; gap: 6px; }
.author-avatar { width: 24px; height: 24px; border-radius: 50%; }
.author-avatar-ph { width: 24px; height: 24px; border-radius: 50%; background: #f3f4f6; display: flex; align-items: center; justify-content: center; }
.author-name { font-size: 13px; color: #4b5563; }
.meta-text { font-size: 12px; color: #9ca3af; }

.body { padding: 16px; }
.paragraph { display: block; font-size: 15px; color: #333; line-height: 1.9; margin-bottom: 14px; }
.video-player { width: 100%; height: 210px; border-radius: 10px; background: #000; margin-bottom: 14px; }
.locked-media { height: 180px; background: #f9fafb; border: 1px dashed #e5e7eb; border-radius: 10px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; margin-bottom: 14px; }
.locked-media-text { font-size: 13px; color: #9ca3af; }
.doc-actions { display: flex; gap: 12px; margin-top: 8px; }
.doc-btn { display: flex; align-items: center; gap: 6px; background: var(--brand); border-radius: 8px; padding: 9px 18px; }
.doc-btn-text { font-size: 14px; color: #fff; }
.doc-btn-plain { background: #fff; border: 1px solid #d1d5db; }
.doc-btn-plain-text { font-size: 14px; color: #4b5563; }

/* 未购试读结束虚化提示 */
.fade-mask { position: relative; margin-top: -80px; }
.fade-gradient { height: 80px; background: linear-gradient(to bottom, rgba(255,255,255,0), #fff 85%); }
.fade-tip { display: flex; align-items: center; justify-content: center; gap: 6px; padding: 8px 0 4px; background: #fff; }
.fade-tip-text { font-size: 13px; color: var(--brand); font-weight: 500; }

.buy-bar { position: fixed; left: 0; right: 0; bottom: 0; z-index: 30; display: flex; align-items: center; justify-content: space-between; background: #fff; border-top: 1px solid #ececec; padding: 10px 16px calc(10px + constant(safe-area-inset-bottom)); padding-bottom: calc(10px + env(safe-area-inset-bottom)); }
.buy-info { display: flex; flex-direction: column; }
.buy-price { font-size: 20px; font-weight: 700; color: var(--brand); }
.buy-note { font-size: 11px; color: #9ca3af; margin-top: 2px; }
.buy-btn { background: var(--brand); border-radius: 999px; padding: 10px 36px; }
.buy-btn-disabled { opacity: 0.6; }
.buy-btn-text { font-size: 15px; font-weight: 600; color: #fff; }

.state-box { padding: 80px 0; display: flex; flex-direction: column; align-items: center; gap: 12px; }
.state-text { font-size: 13px; color: #9ca3af; }
.spinner { width: 28px; height: 28px; border: 3px solid #f0f0f0; border-top-color: var(--brand); border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.retry-btn { margin-top: 4px; padding: 6px 20px; border: 1px solid var(--brand); border-radius: 999px; }
.retry-text { font-size: 13px; color: var(--brand); }
.bottom-safe { height: 40px; }
</style>
