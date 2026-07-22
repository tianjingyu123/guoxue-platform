<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import AppLoading from '@/components/common/app-loading.vue'
import { mineApi, type ExportDataType, type PersonalDataExportPackage } from '@/lib/mine-data'

const exportDataTypes = ref<ExportDataType[]>([])
const selectedTypes = ref<string[]>([])
const loading = ref(true)
const exporting = ref(false)
const error = ref('')
const lastExport = ref<{ fileName: string; exportedAt: string; total: number; delivery: 'download' | 'copy' } | null>(null)

const allSelected = computed(() => exportDataTypes.value.length > 0 && selectedTypes.value.length === exportDataTypes.value.length)
const selectedLabel = computed(() => {
  if (!selectedTypes.value.length) return '尚未选择'
  if (allSelected.value) return `全部 ${selectedTypes.value.length} 类`
  return `已选 ${selectedTypes.value.length} 类`
})

async function fetchTypes() {
  loading.value = true
  error.value = ''
  try {
    const data = await mineApi.getExportTypes()
    exportDataTypes.value = data
    // 默认全选：多数用户来此就是为了带走完整副本，仍可逐项取消。
    if (!selectedTypes.value.length) selectedTypes.value = data.map((item) => item.id)
  } catch (e) {
    error.value = (e as Error)?.message || '加载导出项目失败'
  } finally {
    loading.value = false
  }
}

onMounted(fetchTypes)

function toggleType(id: string) {
  selectedTypes.value = selectedTypes.value.includes(id)
    ? selectedTypes.value.filter((item) => item !== id)
    : [...selectedTypes.value, id]
}

function toggleAll() {
  selectedTypes.value = allSelected.value ? [] : exportDataTypes.value.map((item) => item.id)
}

function fileStamp(value: string) {
  const date = new Date(value)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
}

function formatTime(value: string) {
  const date = new Date(value)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function totalRows(data: PersonalDataExportPackage) {
  return Object.values(data.summary || {}).reduce((sum, count) => sum + Number(count || 0), 0)
}

async function deliverJson(data: PersonalDataExportPackage, fileName: string): Promise<'download' | 'copy'> {
  const json = `${JSON.stringify(data, null, 2)}\n`

  // #ifdef H5
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return 'download'
  // #endif

  // #ifndef H5
  await new Promise<void>((resolve, reject) => {
    uni.setClipboardData({
      data: json,
      success: () => resolve(),
      fail: () => reject(new Error('复制数据失败')),
    })
  })
  return 'copy'
  // #endif
}

async function submit() {
  if (!selectedTypes.value.length || exporting.value) return
  exporting.value = true
  try {
    const data = await mineApi.requestExport(selectedTypes.value)
    const fileName = `热卜国学-个人数据-${fileStamp(data.exportedAt)}.json`
    const delivery = await deliverJson(data, fileName)
    lastExport.value = { fileName, exportedAt: data.exportedAt, total: totalRows(data), delivery }
    if (delivery === 'download') {
      uni.showToast({ title: '数据文件已生成', icon: 'success' })
    } else {
      uni.showModal({
        title: '数据已复制',
        content: '当前设备已将完整 JSON 数据复制到剪贴板，请粘贴到文本应用中保存。',
        showCancel: false,
        confirmText: '知道了',
      })
    }
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '生成失败，请稍后重试', icon: 'none' })
  } finally {
    exporting.value = false
  }
}
</script>

<template>
  <view class="page">
    <app-nav-bar title="导出我的数据" />

    <view v-if="loading" class="state-wrap"><AppLoading /></view>
    <view v-else-if="error" class="state-wrap">
      <view class="state-icon"><AppIcon name="alert-circle" :size="28" color="#B4534B" /></view>
      <text class="state-title">暂时无法加载</text>
      <text class="state-desc">{{ error }}</text>
      <view class="retry-btn" @tap="fetchTypes">重新加载</view>
    </view>

    <scroll-view v-else scroll-y class="scroll" :show-scrollbar="false">
      <view class="hero">
        <view class="hero-glow" />
        <view class="hero-top">
          <view class="hero-copy">
            <text class="hero-kicker">数据可携 · 隐私自控</text>
            <text class="hero-title">把自己的数据，带在自己手里</text>
            <text class="hero-desc">按需选择后即时生成，仅包含当前登录账号的数据。</text>
          </view>
          <view class="hero-shield">
            <AppIcon name="shield-check" :size="30" color="#F5DEC0" />
          </view>
        </view>
        <view class="hero-meta">
          <view class="meta-item"><AppIcon name="user-check" :size="14" color="#F5DEC0" /><text>仅本人</text></view>
          <view class="meta-line" />
          <view class="meta-item"><AppIcon name="check-circle" :size="14" color="#F5DEC0" /><text>即时生成</text></view>
          <view class="meta-line" />
          <view class="meta-item"><AppIcon name="lock" :size="14" color="#F5DEC0" /><text>不留副本</text></view>
        </view>
      </view>

      <view class="section-head">
        <view>
          <text class="section-title">选择数据范围</text>
          <text class="section-sub">{{ selectedLabel }}，可随时重新生成</text>
        </view>
        <view class="select-all" @tap="toggleAll">{{ allSelected ? '取消全选' : '全部选择' }}</view>
      </view>

      <view class="data-card">
        <view
          v-for="item in exportDataTypes"
          :key="item.id"
          class="data-row"
          :class="{ selected: selectedTypes.includes(item.id) }"
          @tap="toggleType(item.id)"
        >
          <view class="data-icon" :class="{ selected: selectedTypes.includes(item.id) }">
            <AppIcon :name="item.icon" :size="20" :color="selectedTypes.includes(item.id) ? '#FFFFFF' : '#766C62'" />
          </view>
          <view class="data-copy">
            <text class="data-name">{{ item.name }}</text>
            <text class="data-desc">{{ item.description }}</text>
          </view>
          <view class="checkbox" :class="{ selected: selectedTypes.includes(item.id) }">
            <AppIcon v-if="selectedTypes.includes(item.id)" name="check" :size="14" color="#FFFFFF" />
          </view>
        </view>
      </view>

      <view class="privacy-card">
        <view class="privacy-icon"><AppIcon name="shield" :size="20" color="#2E6E57" /></view>
        <view class="privacy-copy">
          <text class="privacy-title">敏感凭据不会被导出</text>
          <text class="privacy-desc">文件不包含登录密码、支付密码、第三方登录凭据及平台风控内部字段。订单收货信息仅在您选择“订单数据”时进入本人文件。</text>
        </view>
      </view>

      <view v-if="lastExport" class="success-card">
        <view class="success-mark"><AppIcon name="check" :size="18" color="#FFFFFF" /></view>
        <view class="success-copy">
          <text class="success-title">{{ lastExport.delivery === 'download' ? '数据文件已下载' : '数据内容已复制' }}</text>
          <text class="success-desc">{{ formatTime(lastExport.exportedAt) }} · 共 {{ lastExport.total }} 条记录</text>
          <text class="success-file">{{ lastExport.fileName }}</text>
        </view>
      </view>

      <view class="format-note">
        <AppIcon name="file-text" :size="16" color="#9A8E80" />
        <text>导出格式为通用 JSON，可用文本编辑器查看或交给其他软件处理。</text>
      </view>
      <view class="safe-bottom" />
    </scroll-view>

    <view v-if="!loading && !error" class="footer-bar">
      <view class="footer-copy">
        <text class="footer-count">{{ selectedTypes.length }}</text>
        <text class="footer-label">类数据</text>
      </view>
      <view class="submit-btn" :class="{ disabled: !selectedTypes.length || exporting }" @tap="submit">
        <AppIcon :name="exporting ? 'loader-2' : 'download'" :size="18" color="#FFFFFF" :class="{ spinning: exporting }" />
        <text>{{ exporting ? '正在生成…' : '生成并下载' }}</text>
      </view>
    </view>
  </view>
</template>

<style scoped>
.page { height: 100vh; display: flex; flex-direction: column; overflow: hidden; background: #F6F2EB; color: #2D2925; }
.scroll { flex: 1; min-height: 0; box-sizing: border-box; }
.state-wrap { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40rpx; }
.state-icon { width: 104rpx; height: 104rpx; border-radius: 32rpx; background: #F6E8E4; display: flex; align-items: center; justify-content: center; margin-bottom: 24rpx; }
.state-title { font-size: 30rpx; font-weight: 700; color: #342F2A; }
.state-desc { max-width: 520rpx; margin-top: 12rpx; color: #8B8176; font-size: 24rpx; line-height: 1.6; text-align: center; }
.retry-btn { margin-top: 30rpx; padding: 18rpx 46rpx; border-radius: 999rpx; background: #8B2E34; color: #FFFFFF; font-size: 26rpx; font-weight: 600; }

.hero { position: relative; overflow: hidden; margin: 24rpx 24rpx 0; padding: 34rpx 32rpx 26rpx; border-radius: 30rpx; background: linear-gradient(145deg, #392A27 0%, #562A2D 58%, #7B3038 100%); box-shadow: 0 16rpx 40rpx rgba(71, 32, 34, 0.16); }
.hero-glow { position: absolute; width: 300rpx; height: 300rpx; right: -100rpx; top: -150rpx; border-radius: 50%; background: rgba(232, 190, 125, 0.16); }
.hero-top { position: relative; display: flex; align-items: flex-start; gap: 26rpx; }
.hero-copy { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.hero-kicker { font-size: 21rpx; letter-spacing: 4rpx; color: #E8C99A; }
.hero-title { margin-top: 15rpx; max-width: 480rpx; font-size: 36rpx; line-height: 1.34; font-weight: 700; color: #FFF9F0; }
.hero-desc { margin-top: 15rpx; font-size: 23rpx; line-height: 1.6; color: rgba(255, 249, 240, 0.72); }
.hero-shield { flex: 0 0 82rpx; width: 82rpx; height: 82rpx; border: 1rpx solid rgba(245, 222, 192, 0.34); border-radius: 26rpx; background: rgba(255, 255, 255, 0.08); display: flex; align-items: center; justify-content: center; }
.hero-meta { position: relative; margin-top: 28rpx; padding-top: 22rpx; border-top: 1rpx solid rgba(255, 255, 255, 0.12); display: flex; align-items: center; justify-content: space-between; }
.meta-item { display: flex; align-items: center; gap: 8rpx; color: rgba(255, 249, 240, 0.84); font-size: 21rpx; }
.meta-line { width: 1rpx; height: 24rpx; background: rgba(255, 255, 255, 0.16); }

.section-head { display: flex; justify-content: space-between; align-items: flex-end; padding: 34rpx 28rpx 18rpx; }
.section-head > view:first-child { display: flex; flex-direction: column; gap: 7rpx; }
.section-title { font-size: 30rpx; font-weight: 700; color: #302B27; }
.section-sub { font-size: 22rpx; color: #9A8E80; }
.select-all { padding: 12rpx 0 8rpx 24rpx; color: #9A3A40; font-size: 24rpx; font-weight: 600; }

.data-card { margin: 0 24rpx; border: 1rpx solid #E9E1D5; border-radius: 26rpx; overflow: hidden; background: #FFFFFF; box-shadow: 0 8rpx 28rpx rgba(82, 64, 45, 0.06); }
.data-row { min-height: 116rpx; padding: 22rpx 24rpx; display: flex; align-items: center; gap: 20rpx; border-bottom: 1rpx solid #F0EAE1; box-sizing: border-box; transition: background 0.16s ease; }
.data-row:last-child { border-bottom: 0; }
.data-row:active { background: #FAF6F0; }
.data-row.selected { background: linear-gradient(90deg, rgba(139, 46, 52, 0.035), transparent 68%); }
.data-icon { width: 72rpx; height: 72rpx; flex: 0 0 72rpx; border-radius: 22rpx; background: #F2EDE6; display: flex; align-items: center; justify-content: center; }
.data-icon.selected { background: #8B2E34; box-shadow: 0 8rpx 18rpx rgba(139, 46, 52, 0.18); }
.data-copy { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 7rpx; }
.data-name { color: #332E29; font-size: 27rpx; font-weight: 650; }
.data-desc { color: #94897D; font-size: 22rpx; line-height: 1.45; }
.checkbox { width: 38rpx; height: 38rpx; flex: 0 0 38rpx; border: 2rpx solid #D8CEC0; border-radius: 12rpx; display: flex; align-items: center; justify-content: center; box-sizing: border-box; }
.checkbox.selected { border-color: #8B2E34; background: #8B2E34; }

.privacy-card { margin: 24rpx 24rpx 0; padding: 25rpx 26rpx; border: 1rpx solid #D8E8DE; border-radius: 24rpx; background: #F1F8F4; display: flex; align-items: flex-start; gap: 18rpx; }
.privacy-icon { width: 58rpx; height: 58rpx; flex: 0 0 58rpx; border-radius: 18rpx; background: #DDEEE4; display: flex; align-items: center; justify-content: center; }
.privacy-copy { flex: 1; display: flex; flex-direction: column; gap: 8rpx; }
.privacy-title { color: #285B48; font-size: 25rpx; font-weight: 700; }
.privacy-desc { color: #5C776B; font-size: 21rpx; line-height: 1.65; }

.success-card { margin: 24rpx 24rpx 0; padding: 25rpx 26rpx; border-radius: 24rpx; background: #FFFFFF; border: 1rpx solid #E6DED2; display: flex; gap: 18rpx; box-shadow: 0 8rpx 22rpx rgba(67, 51, 37, 0.05); }
.success-mark { width: 50rpx; height: 50rpx; flex: 0 0 50rpx; border-radius: 50%; background: #2E7B59; display: flex; align-items: center; justify-content: center; }
.success-copy { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 7rpx; }
.success-title { color: #2C4F40; font-size: 26rpx; font-weight: 700; }
.success-desc { color: #7F766C; font-size: 21rpx; }
.success-file { color: #A09990; font-size: 20rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.format-note { margin: 24rpx 30rpx 0; display: flex; align-items: flex-start; gap: 12rpx; color: #978C80; font-size: 21rpx; line-height: 1.55; }
.format-note text { flex: 1; }
.safe-bottom { height: 42rpx; }

.footer-bar { flex: 0 0 auto; padding: 18rpx 24rpx calc(18rpx + env(safe-area-inset-bottom)); border-top: 1rpx solid #E8E0D5; background: rgba(255, 255, 255, 0.96); display: flex; align-items: center; gap: 22rpx; box-shadow: 0 -8rpx 28rpx rgba(70, 52, 36, 0.05); }
.footer-copy { width: 112rpx; display: flex; align-items: baseline; gap: 5rpx; }
.footer-count { color: #8B2E34; font-size: 34rpx; line-height: 1; font-weight: 750; }
.footer-label { color: #8F8479; font-size: 21rpx; }
.submit-btn { flex: 1; height: 88rpx; border-radius: 22rpx; background: linear-gradient(135deg, #8B2E34, #A54046); color: #FFFFFF; display: flex; align-items: center; justify-content: center; gap: 12rpx; font-size: 28rpx; font-weight: 700; box-shadow: 0 10rpx 22rpx rgba(139, 46, 52, 0.2); }
.submit-btn.disabled { opacity: 0.45; box-shadow: none; }
.spinning { animation: spin 0.9s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
