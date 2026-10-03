<template>
  <view class="mat-page">
    <!-- 自定义导航（statusBarHeight 留白） -->
    <view class="mat-nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="mat-nav-inner">
        <view class="mat-nav-btn hit" @tap="goBack">
          <app-icon name="arrow-left" :size="40" color="#2C2C2C" />
        </view>
        <text class="mat-nav-title">推广素材库</text>
        <view class="mat-nav-btn hit" :class="{ spinning: loading }" @tap="onRefresh">
          <app-icon name="refresh-cw" :size="34" color="#6E6E73" />
        </view>
      </view>
    </view>

    <!-- 类型 Tab（下划线激活） -->
    <view v-if="!notOpened" class="mat-ttabs">
      <view
        v-for="t in tabs"
        :key="t.value"
        class="mat-ttab hit"
        :class="{ on: activeTab === t.value }"
        @tap="activeTab = t.value"
      >
        <text class="mat-ttab-txt">{{ t.label }}</text>
        <view v-if="activeTab === t.value" class="mat-ttab-line" />
      </view>
    </view>

    <!-- loading -->
    <view v-if="loading" class="mat-state">
      <view class="mat-spinner" />
      <text class="mat-state-txt">加载中…</text>
    </view>

    <!-- 未开通分站 -->
    <view v-else-if="notOpened" class="mat-state">
      <view class="mat-state-ic"><app-icon name="store" :size="72" color="#C9A96E" /></view>
      <text class="mat-state-title">你还没有开通分站</text>
      <text class="mat-state-desc">开通后即可获取专属推广海报、文案与推广码</text>
      <view class="mat-state-btn hit" @tap="goJoin"><text class="mat-state-btn-txt">去开通分站</text></view>
    </view>

    <!-- error -->
    <view v-else-if="error" class="mat-state">
      <view class="mat-state-ic"><app-icon name="alert-circle" :size="72" color="#C9A96E" /></view>
      <text class="mat-state-title">加载失败</text>
      <text class="mat-state-desc">{{ error }}</text>
      <view class="mat-state-btn hit" @tap="load"><text class="mat-state-btn-txt">重新加载</text></view>
    </view>

    <template v-else>
      <!-- ══════════ ① 海报 Tab ══════════ -->
      <view v-if="activeTab === 'poster'">
        <view v-if="posters.length === 0" class="mat-empty">
          <view class="mat-empty-ic"><app-icon name="image" :size="60" color="#C9A96E" /></view>
          <text class="mat-empty-title">制作专属推广海报</text>
          <text class="mat-empty-desc">自动带入分站名称和推广码，生成后可保存分享</text>
          <view class="mat-state-btn hit" @tap="goPoster"><text class="mat-state-btn-txt">去生成海报</text></view>
        </view>
        <view v-else class="mat-pgrid">
          <view v-for="p in posters" :key="p.id" class="mat-pcard">
            <view class="mat-pcover">
              <image v-if="p.imageUrl" lazy-load :src="p.imageUrl" class="mat-pcover-img" mode="aspectFill" />
              <view v-else class="mat-pcover-ph">
                <text class="mat-pcover-ph-s">热卜国学</text>
                <text class="mat-pcover-ph-b serif">{{ p.title }}</text>
              </view>
              <view v-if="p.tags.length" class="mat-pbadge"><text class="mat-pbadge-txt">{{ p.tags[0] }}</text></view>
            </view>
            <view class="mat-pfoot">
              <text class="mat-pname">{{ p.title }}</text>
              <text class="mat-puse">已使用 {{ p.usageCount }} 次</text>
              <view class="mat-pbtn hit" :class="{ disabled: actingId === p.id }" @tap="p.imageUrl ? savePoster(p) : goPoster()">
                <app-icon :name="p.imageUrl ? 'download' : 'image-plus'" :size="26" color="#C41E3A" />
                <text class="mat-pbtn-txt">{{ p.imageUrl ? '保存 / 分享' : '生成专属海报' }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- ══════════ ② 推广文案 Tab ══════════ -->
      <view v-else-if="activeTab === 'copy'">
        <view v-if="copys.length === 0" class="mat-empty">
          <view class="mat-empty-ic"><app-icon name="file-text" :size="60" color="#C9A96E" /></view>
          <text class="mat-empty-title">暂无推广文案</text>
          <text class="mat-empty-desc">平台尚未配置推广文案，可先分享专属推广码</text>
        </view>
        <view v-else class="mat-tlist">
          <view v-for="c in copys" :key="c.id" class="mat-titem">
            <view class="mat-ttag-row">
              <text v-if="c.tags.length" class="mat-ttag" :class="tagClass(c.tags[0])">{{ c.tags[0] }}</text>
              <text v-else class="mat-ttag mat-ttag-course">推广文案</text>
              <text class="mat-tuse">被使用 {{ c.usageCount }} 次</text>
            </view>
            <text class="mat-tbody" :class="{ clamp: expandedId !== c.id }">{{ c.content }}</text>
            <text
              v-if="c.content.length > 60 || c.content.split('\n').length > 3"
              class="mat-ttoggle hit"
              @tap="expandedId = expandedId === c.id ? '' : c.id"
            >{{ expandedId === c.id ? '收起' : '展开全文' }}</text>
            <view
              class="mat-tcopy hit"
              :class="{ copied: copiedId === c.id, disabled: actingId === c.id }"
              @tap="handleCopy(c)"
            >
              <app-icon :name="copiedId === c.id ? 'check' : 'copy'" :size="26" :color="copiedId === c.id ? '#ffffff' : '#C41E3A'" />
              <text class="mat-tcopy-txt" :style="{ color: copiedId === c.id ? '#fff' : '#C41E3A' }">{{ copiedId === c.id ? '已复制' : '一键复制' }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- ══════════ ③ 推广码 Tab ══════════ -->
      <view v-else-if="activeTab === 'qrcode'">
        <view class="mat-qwrap">
          <view class="mat-qcard">
            <text class="mat-qtitle serif">我的专属推广码</text>
            <text class="mat-qsub">用户扫码进入 = 自动归属你的分站</text>
            <view class="mat-qcode">
              <image v-if="qrImageUrl" :src="qrImageUrl" class="mat-qcode-img" mode="aspectFit" />
              <app-icon v-else name="qr-code" :size="120" color="#C9A96E" />
            </view>
            <text class="mat-qname">{{ stationName || '我的分站' }}</text>
            <text v-if="stationCode" class="mat-qid">推广码 {{ stationCode }}</text>
            <view class="mat-qbtns">
              <view class="mat-qbtn ghost hit" @tap="copyInviteLink">
                <app-icon name="copy" :size="28" color="#C41E3A" />
                <text class="mat-qbtn-txt mat-qbtn-txt-red">复制链接</text>
              </view>
              <view class="mat-qbtn primary hit" :class="{ disabled: !qrImageUrl }" @tap="saveQrImage">
                <app-icon name="download" :size="28" color="#ffffff" />
                <text class="mat-qbtn-txt mat-qbtn-txt-white">保存图片</text>
              </view>
            </view>
          </view>

          <!-- 无二维码素材时诚实降级说明 -->
          <text v-if="!qrImageUrl" class="mat-qtip">二维码图片将由平台生成后自动同步，当前可先复制专属链接分享</text>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo, navigateBack } from '@/utils/router'
import { operatorApi, type PromotionMaterialItem } from '@/pkg-operator/lib/operator-data'
import { buildH5Url } from '@/utils/share'

const statusBarHeight = ref(20)
try {
  const info = uni.getSystemInfoSync()
  statusBarHeight.value = info.statusBarHeight || 20
} catch (e) {}

const loading = ref(true)
const error = ref('')
const notOpened = ref(false)

const materials = ref<PromotionMaterialItem[]>([])
const actingId = ref('') // 写操作防重
const copiedId = ref('') // 复制成功反馈
const expandedId = ref('') // 文案展开

// 推广码 Tab 所需分站信息（复用 getStationConfig → /station/my）
const stationName = ref('')
const stationCode = ref('')

const activeTab = ref<'poster' | 'copy' | 'qrcode'>('poster')

const posters = computed(() => materials.value.filter((m) => m.type === 'poster'))
const copys = computed(() => materials.value.filter((m) => m.type === 'copy'))
const qrcodes = computed(() => materials.value.filter((m) => m.type === 'qrcode'))
// 专属二维码图：取第一条 qrcode 素材的图
const qrImageUrl = computed(() => qrcodes.value.find((q) => q.imageUrl)?.imageUrl || '')

const tabs = [
  { value: 'poster' as const, label: '海报' },
  { value: 'copy' as const, label: '推广文案' },
  { value: 'qrcode' as const, label: '推广码' },
]

// 文案标签配色（对齐 V0：课程/商品/品牌）
function tagClass(tag: string): string {
  if (tag.includes('商品') || tag.includes('产品')) return 'mat-ttag-product'
  if (tag.includes('品牌')) return 'mat-ttag-brand'
  return 'mat-ttag-course'
}

function goPoster() {
  navigateTo('/pkg-operator/station-poster/index')
}

// 专属邀请链接（与 operator-data getDashboardInviteLink 同源规则，用分站 code）
const inviteUrl = computed(() => {
  return stationCode.value ? buildH5Url('/pages/index/index', { ref: stationCode.value }) : ''
})

async function load() {
  loading.value = true
  error.value = ''
  notOpened.value = false
  try {
    // 分站信息（推广码 Tab 用）+ 素材列表并行；分站信息失败不阻断素材
    const [cfg, list] = await Promise.allSettled([
      operatorApi.getStationConfig(),
      operatorApi.getMyStationMaterials(),
    ])

    if (list.status === 'fulfilled') {
      materials.value = list.value
    } else {
      const msg = (list.reason as Error)?.message || ''
      if (msg.includes('开通分站') || msg.includes('没有开通') || msg.includes('NOT_FOUND') || msg.includes('404')) {
        notOpened.value = true
        return
      }
      throw list.reason
    }

    if (cfg.status === 'fulfilled') {
      stationName.value = cfg.value.name
      stationCode.value = cfg.value.code
    }
  } catch (e) {
    const msg = (e as Error)?.message || ''
    if (msg.includes('开通分站') || msg.includes('没有开通') || msg.includes('NOT_FOUND') || msg.includes('404')) {
      notOpened.value = true
    } else {
      error.value = msg || '加载失败，请重试'
    }
  } finally {
    loading.value = false
  }
}

// 海报：保存图片到相册（uni saveImageToPhotosAlbum）+ 记录使用
async function savePoster(m: PromotionMaterialItem) {
  if (actingId.value) return
  if (!m.imageUrl) {
    goPoster()
    return
  }
  actingId.value = m.id
  uni.showLoading({ title: '保存中…' })
  try {
    const url = await new Promise<string>((resolve, reject) => {
      uni.downloadFile({
        url: m.imageUrl,
        success: (r) => (r.statusCode === 200 ? resolve(r.tempFilePath) : reject(new Error('下载失败'))),
        fail: () => reject(new Error('下载失败')),
      })
    })
    await new Promise<void>((resolve, reject) => {
      uni.saveImageToPhotosAlbum({
        filePath: url,
        success: () => resolve(),
        fail: (err) => reject(new Error(err?.errMsg || '保存失败')),
      })
    })
    uni.hideLoading()
    uni.showToast({ title: '已保存到相册', icon: 'success' })
    try {
      await operatorApi.useStationMaterial(m.id)
      m.usageCount = (m.usageCount || 0) + 1
    } catch (e) {
      // 保存已成功，记录失败不打断
    }
  } catch (e) {
    uni.hideLoading()
    const msg = (e as Error)?.message || '保存失败'
    // 用户拒绝授权相册权限
    if (msg.includes('auth') || msg.includes('deny')) {
      uni.showToast({ title: '请授权保存到相册', icon: 'none' })
    } else {
      uni.showToast({ title: msg, icon: 'none' })
    }
  } finally {
    actingId.value = ''
  }
}

// 文案：复制全文（uni.setClipboardData + toast）+ 记录使用
async function handleCopy(c: PromotionMaterialItem) {
  if (actingId.value) return
  actingId.value = c.id
  try {
    await new Promise<void>((resolve, reject) => {
      uni.setClipboardData({ data: c.content, success: () => resolve(), fail: () => reject(new Error('复制失败')) })
    })
    copiedId.value = c.id
    setTimeout(() => {
      if (copiedId.value === c.id) copiedId.value = ''
    }, 2000)
    uni.showToast({ title: '已复制', icon: 'none' })
    try {
      await operatorApi.useStationMaterial(c.id)
      c.usageCount = (c.usageCount || 0) + 1
    } catch (e) {
      // 复制已成功，记录失败不打断
    }
  } catch (e) {
    uni.showToast({ title: '复制失败', icon: 'none' })
  } finally {
    actingId.value = ''
  }
}

// 推广码：复制专属链接
function copyInviteLink() {
  if (!inviteUrl.value) {
    uni.showToast({ title: '推广链接生成中', icon: 'none' })
    return
  }
  uni.setClipboardData({
    data: inviteUrl.value,
    success: () => uni.showToast({ title: '链接已复制', icon: 'none' }),
    fail: () => uni.showToast({ title: '复制失败', icon: 'none' }),
  })
}

// 推广码：保存二维码图片到相册
async function saveQrImage() {
  if (!qrImageUrl.value) {
    uni.showToast({ title: '二维码图片生成中', icon: 'none' })
    return
  }
  uni.showLoading({ title: '保存中…' })
  try {
    const url = await new Promise<string>((resolve, reject) => {
      uni.downloadFile({
        url: qrImageUrl.value,
        success: (r) => (r.statusCode === 200 ? resolve(r.tempFilePath) : reject(new Error('下载失败'))),
        fail: () => reject(new Error('下载失败')),
      })
    })
    await new Promise<void>((resolve, reject) => {
      uni.saveImageToPhotosAlbum({
        filePath: url,
        success: () => resolve(),
        fail: (err) => reject(new Error(err?.errMsg || '保存失败')),
      })
    })
    uni.hideLoading()
    uni.showToast({ title: '已保存到相册', icon: 'success' })
  } catch (e) {
    uni.hideLoading()
    const msg = (e as Error)?.message || '保存失败'
    if (msg.includes('auth') || msg.includes('deny')) {
      uni.showToast({ title: '请授权保存到相册', icon: 'none' })
    } else {
      uni.showToast({ title: msg, icon: 'none' })
    }
  }
}

function onRefresh() {
  if (loading.value) return
  load()
}
function goBack() {
  navigateBack()
}
function goJoin() {
  navigateTo('/pkg-operator/join-station/index')
}

onLoad((q: Record<string, string> = {}) => {
  const tab = q.tab
  if (tab === 'poster' || tab === 'copy' || tab === 'qrcode') activeTab.value = tab
  load()
})
</script>

<style lang="scss" scoped>
/* ===== token ===== */
$paper: #faf8f5;
$card: #ffffff;
$red: #c41e3a;
$red-deep: #a01828;
$gold: #c9a96e;
$t1: #2c2c2c;
$t2: #6e6e73;
$t3: #9a9a9a;
$line: #efebe4;
$px: 38rpx;
$radius: 35rpx;
$shadow: 0 2rpx 20rpx rgba(44, 38, 30, 0.05);

.serif {
  font-family: 'Songti SC', 'STSong', serif;
}

.mat-page {
  min-height: 100vh;
  background: $paper;
}
.hit {
  /* 热区兜底 ≥88rpx（通过 padding/尺寸保证） */
}

/* 自定义导航 */
.mat-nav {
  position: sticky;
  top: 0;
  z-index: 50;
  background: $card;
  border-bottom: 1rpx solid $line;
}
.mat-nav-inner {
  height: 92rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 $px;
}
.mat-nav-btn {
  width: 88rpx;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.mat-nav-btn.spinning {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
.mat-nav-title {
  font-size: 33rpx;
  font-weight: 600;
  color: $t1;
}

/* 类型 Tab（下划线激活） */
.mat-ttabs {
  display: flex;
  background: $card;
  border-bottom: 1rpx solid $line;
}
.mat-ttab {
  flex: 1;
  height: 88rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
}
.mat-ttab-txt {
  font-size: 28rpx;
  color: $t2;
}
.mat-ttab.on .mat-ttab-txt {
  color: $red;
  font-weight: 600;
}
.mat-ttab-line {
  position: absolute;
  bottom: 0;
  width: 46rpx;
  height: 4rpx;
  background: $red;
  border-radius: 2rpx;
}

/* 三态 */
.mat-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 160rpx $px;
  gap: 20rpx;
}
.mat-state-ic {
  width: 140rpx;
  height: 140rpx;
  border-radius: 40rpx;
  background: rgba(201, 169, 110, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8rpx;
}
.mat-state-title {
  font-size: 32rpx;
  font-weight: 600;
  color: $t1;
}
.mat-state-desc {
  font-size: 26rpx;
  color: $t3;
  text-align: center;
  line-height: 1.6;
}
.mat-state-txt {
  font-size: 28rpx;
  color: $t2;
}
.mat-spinner {
  width: 56rpx;
  height: 56rpx;
  border: 6rpx solid rgba(196, 30, 58, 0.15);
  border-top-color: $red;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
.mat-state-btn {
  margin-top: 16rpx;
  min-height: 88rpx;
  padding: 0 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: $red;
  border-radius: 999rpx;
}
.mat-state-btn-txt {
  color: #fff;
  font-size: 28rpx;
  font-weight: 600;
}

/* 空态 */
.mat-empty {
  padding: 130rpx $px 80rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
}
.mat-empty-ic {
  width: 130rpx;
  height: 130rpx;
  border-radius: 38rpx;
  background: rgba(201, 169, 110, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8rpx;
}
.mat-empty-title {
  font-size: 30rpx;
  font-weight: 600;
  color: $t2;
}
.mat-empty-desc {
  font-size: 26rpx;
  color: $t3;
}

/* ① 海报网格 */
.mat-pgrid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 27rpx;
  padding: 30rpx $px 60rpx;
}
.mat-pcard {
  background: $card;
  border: 1rpx solid $line;
  border-radius: 31rpx;
  overflow: hidden;
  box-shadow: $shadow;
}
.mat-pcover {
  height: 358rpx;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(160deg, $red-deep, $red);
}
.mat-pcover-img {
  width: 100%;
  height: 100%;
}
.mat-pcover-ph {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 20rpx;
}
.mat-pcover-ph-s {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.85);
  letter-spacing: 4rpx;
  margin-bottom: 12rpx;
}
.mat-pcover-ph-b {
  font-size: 34rpx;
  font-weight: 700;
  color: #fff;
  text-align: center;
  line-height: 1.4;
}
.mat-pbadge {
  position: absolute;
  top: 18rpx;
  left: 18rpx;
  height: 42rpx;
  padding: 0 16rpx;
  border-radius: 13rpx;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
}
.mat-pbadge-txt {
  color: #fff;
  font-size: 21rpx;
}
.mat-pfoot {
  padding: 21rpx 23rpx 25rpx;
}
.mat-pname {
  font-size: 25rpx;
  font-weight: 600;
  color: $t1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
}
.mat-puse {
  font-size: 21rpx;
  color: $t3;
  margin-top: 6rpx;
  display: block;
}
.mat-pbtn {
  margin-top: 17rpx;
  min-height: 62rpx;
  border-radius: 17rpx;
  background: rgba(196, 30, 58, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
}
.mat-pbtn.disabled {
  opacity: 0.5;
}
.mat-pbtn-txt {
  font-size: 23rpx;
  font-weight: 600;
  color: $red;
}

/* ② 文案列表 */
.mat-tlist {
  padding: 30rpx $px 60rpx;
  display: flex;
  flex-direction: column;
  gap: 27rpx;
}
.mat-titem {
  background: $card;
  border: 1rpx solid $line;
  border-radius: 31rpx;
  padding: 31rpx;
  box-shadow: $shadow;
}
.mat-ttag-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 19rpx;
}
.mat-ttag {
  font-size: 21rpx;
  font-weight: 600;
  padding: 6rpx 19rpx;
  border-radius: 13rpx;
}
.mat-ttag-course {
  background: rgba(196, 30, 58, 0.1);
  color: $red;
}
.mat-ttag-product {
  background: rgba(201, 169, 110, 0.16);
  color: #97794a;
}
.mat-ttag-brand {
  background: rgba(46, 110, 139, 0.1);
  color: #2e6e8b;
}
.mat-tuse {
  font-size: 21rpx;
  color: $t3;
}
.mat-tbody {
  font-size: 25rpx;
  color: $t2;
  line-height: 1.75;
  white-space: pre-wrap;
}
.mat-tbody.clamp {
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.mat-ttoggle {
  font-size: 23rpx;
  color: $red;
  margin-top: 12rpx;
  display: inline-block;
  padding: 6rpx 0;
}
.mat-tcopy {
  margin-top: 27rpx;
  min-height: 73rpx;
  border-radius: 21rpx;
  border: 1rpx solid $red;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
}
.mat-tcopy.copied {
  background: #22c55e;
  border-color: #22c55e;
}
.mat-tcopy.disabled {
  opacity: 0.6;
}
.mat-tcopy-txt {
  font-size: 25rpx;
  font-weight: 600;
  color: $red;
}

/* ③ 推广码 */
.mat-qwrap {
  padding: 46rpx $px;
}
.mat-qcard {
  background: $card;
  border: 1rpx solid $line;
  border-radius: $radius;
  padding: 54rpx 46rpx;
  text-align: center;
  box-shadow: $shadow;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.mat-qtitle {
  font-size: 31rpx;
  font-weight: 600;
  color: $t1;
  margin-bottom: 8rpx;
}
.mat-qsub {
  font-size: 23rpx;
  color: $t3;
  margin-bottom: 42rpx;
}
.mat-qcode {
  width: 346rpx;
  height: 346rpx;
  border-radius: 27rpx;
  background: #fff;
  border: 1rpx solid $line;
  padding: 23rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.mat-qcode-img {
  width: 100%;
  height: 100%;
}
.mat-qname {
  font-size: 27rpx;
  font-weight: 600;
  color: $t1;
  margin-top: 35rpx;
}
.mat-qid {
  font-size: 23rpx;
  color: $t3;
  margin-top: 8rpx;
}
.mat-qbtns {
  display: flex;
  gap: 23rpx;
  margin-top: 46rpx;
  width: 100%;
}
.mat-qbtn {
  flex: 1;
  min-height: 88rpx;
  border-radius: 23rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
}
.mat-qbtn.primary {
  background: $red;
}
.mat-qbtn.ghost {
  background: $card;
  border: 1rpx solid $red;
}
.mat-qbtn.disabled {
  opacity: 0.5;
}
.mat-qbtn-txt {
  font-size: 27rpx;
  font-weight: 600;
}
.mat-qbtn-txt-red {
  color: $red;
}
.mat-qbtn-txt-white {
  color: #fff;
}
.mat-qtip {
  display: block;
  margin-top: 27rpx;
  font-size: 23rpx;
  color: $t3;
  text-align: center;
  line-height: 1.6;
}
</style>
