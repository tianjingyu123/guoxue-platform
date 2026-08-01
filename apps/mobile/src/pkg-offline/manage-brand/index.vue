<template>
  <view class="mb-page">
    <!-- 自定义导航栏 -->
    <view class="mb-nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="mb-nav-row">
        <view class="mb-nav-btn" @tap="goBack">
          <app-icon name="chevron-left" :size="22" color="#2C2C2C" />
        </view>
        <text class="mb-nav-title">品牌资料</text>
        <text class="mb-nav-preview" @tap="onPreview">预览主页 ›</text>
      </view>
    </view>

    <!-- 加载态 -->
    <view v-if="loading" class="mb-state">
      <view class="spinner" />
      <text class="mb-state-text">加载中…</text>
    </view>
    <!-- 错误 / 非驿站主 -->
    <view v-else-if="!station" class="mb-state">
      <app-icon name="store" :size="48" color="#C9A96E" />
      <text class="mb-state-text">{{ errMsg || '您还不是驿站运营者' }}</text>
      <view class="mb-retry" @tap="load"><text class="mb-retry-text">重试</text></view>
    </view>

    <template v-else>
      <scroll-view scroll-y class="mb-body">
        <view class="mb-inner">
          <!-- ① 基础信息（后端此处不可改·只读展示·改名走平台审核） -->
          <view class="mb-card">
            <text class="mb-sec">基础信息</text>
            <view class="mb-frow">
              <text class="mb-frow-lb">驿站名称</text>
              <text class="mb-frow-vl">{{ station.name || '—' }}</text>
            </view>
            <view class="mb-frow">
              <text class="mb-frow-lb">驿站 logo</text>
              <view class="mb-frow-vl-box">
                <image v-if="station.cover" :src="station.cover" class="mb-logo" mode="aspectFill" />
                <view v-else class="mb-logo mb-logo-ph"><text class="mb-logo-txt">logo</text></view>
              </view>
            </view>
            <view class="mb-frow">
              <text class="mb-frow-lb">所在城市</text>
              <text class="mb-frow-vl">{{ station.city || '—' }}</text>
            </view>
            <view class="mb-frow mb-frow-last">
              <text class="mb-frow-lb">营业时间</text>
              <text class="mb-frow-vl">{{ businessHoursText }}</text>
            </view>
          </view>

          <!-- ② 环境图（16:9·最多9张·首图为头图·可编辑上传） -->
          <view class="mb-card">
            <view class="mb-sec-row">
              <text class="mb-sec mb-sec-inline">环境图</text>
              <text class="mb-tip-inline">16:9 · 建议 1280×720 · 最多 9 张</text>
            </view>
            <view class="mb-photos">
              <view v-for="(p, i) in photos" :key="p + i" class="mb-photo">
                <image lazy-load :src="p" class="mb-photo-img" mode="aspectFill" @tap="previewPhoto(i)" />
                <view v-if="i === 0" class="mb-photo-cover"><text class="mb-photo-cover-txt">头图</text></view>
                <view class="mb-photo-del" @tap.stop="removePhoto(i)">
                  <app-icon name="x" :size="12" color="#fff" />
                </view>
              </view>
              <view v-if="photos.length < 9" class="mb-photo mb-photo-add" @tap="addPhotos">
                <app-icon name="plus" :size="18" color="#c5bba9" />
                <text class="mb-photo-add-txt">上传</text>
                <text class="mb-photo-add-size">1280×720</text>
              </view>
            </view>
            <text class="mb-tip">第一张作为驿站头图，展示在学员端详情页顶部</text>
          </view>

          <!-- ③ 地址与联系方式（后端此处不可改·只读展示·改址走平台审核） -->
          <view class="mb-card">
            <text class="mb-sec">地址与联系方式</text>
            <view class="mb-frow">
              <text class="mb-frow-lb">驿站地址</text>
              <text class="mb-frow-vl">{{ station.address || '—' }}</text>
            </view>
            <view class="mb-frow mb-frow-last">
              <text class="mb-frow-lb">联系电话</text>
              <text class="mb-frow-vl">{{ station.phone || '—' }}</text>
            </view>
          </view>

          <!-- ④ 驿站介绍（brandStory·对外主页内容·可编辑） -->
          <view class="mb-card">
            <view class="mb-sec-row">
              <text class="mb-sec mb-sec-inline">驿站介绍</text>
              <text class="mb-tip-inline">· 展示在学员端详情页</text>
            </view>
            <textarea
              v-model="brandStory"
              class="mb-story-input"
              placeholder="驿站定位 / 场地规模 / 课程方向 / 师承脉络……好故事是最好的招生文案"
              :maxlength="3000"
              auto-height
            />
            <text class="mb-count">{{ brandStory.length }}/3000</text>
          </view>

          <!-- 审核说明 -->
          <text class="mb-note">说明：名称、地址等对外基础信息在此仅作展示，如需修改请联系平台；修改后需平台审核，审核期间学员端展示原内容。</text>

          <view class="mb-safe" />
        </view>
      </scroll-view>

      <!-- 底部保存 -->
      <view class="mb-footer">
        <view class="mb-save" :class="{ disabled: submitting }" @tap="onSave">
          <text class="mb-save-txt">{{ submitting ? '保存中…' : '保存修改' }}</text>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
/**
 * 驿站品牌资料（B2·B 端驿站运营者）
 * 数据：GET /offline/stations/my 回显（name/city/address/phone/cover/businessHours 只读展示，
 *      brandStory/photos/featuredTeacherIds 可编辑）；PUT /offline/stations/my/brand 保存。
 * 诚实降级（铁律）：后端 updateBrand 仅接收 brandStory/photos/featuredTeacherIds，
 *   故名称/城市/地址/电话/logo/营业时间在此只读展示（改名改址走平台审核，非本页职责）；
 *   环境图=photos（可上传/删除/首图为头图）；驿站介绍=brandStory。
 *   featuredTeacherIds 本页不再编辑（mockup 未含讲师阵容区），保存时原样透传避免丢数据。
 * 环境图上传：uni.chooseImage 多选 + utils/request.uploadImage 逐张上传（与现有页同范式）。
 */
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo } from '@/utils/router'
import { uploadImage } from '@/utils/request'
import { offlineManageApi, type MyStation, type BusinessHour } from '@/lib/offline-data'

const statusBarHeight = ref(0)
try {
  statusBarHeight.value = uni.getSystemInfoSync().statusBarHeight || 0
} catch {}

const loading = ref(true)
const errMsg = ref('')
const station = ref<MyStation | null>(null)

// 可编辑表单态
const brandStory = ref('')
const photos = ref<string[]>([])
// 讲师阵容：本页不编辑，保存时原样透传（诚实保留后端已有数据）
const featuredIds = ref<string[]>([])

// 营业时间人话（后端 businessHours 只读展示；无数据则占位）
const WEEK_LABEL: Record<string, string> = {
  mon: '周一', tue: '周二', wed: '周三', thu: '周四', fri: '周五', sat: '周六', sun: '周日',
}
const businessHoursText = computed(() => {
  const hrs = station.value?.businessHours
  if (!Array.isArray(hrs) || hrs.length === 0) return '未设置'
  const open = hrs.filter((h) => h.isOpen && h.open && h.close)
  if (open.length === 0) return '暂未营业'
  // 若所有营业日时段一致，压缩成「09:00–21:00」，闭馆日单列
  const spans = new Set(open.map((h) => `${h.open}–${h.close}`))
  const closed = hrs.filter((h) => !h.isOpen).map((h) => WEEK_LABEL[h.day] || h.day)
  if (spans.size === 1) {
    const span = [...spans][0]
    return closed.length ? `${span} · ${closed.join('/')}闭馆` : span
  }
  // 时段不一致：逐日列出（取前 3 条避免过长）
  return open.slice(0, 3).map((h: BusinessHour) => `${WEEK_LABEL[h.day] || h.day} ${h.open}–${h.close}`).join(' · ')
})

async function load() {
  loading.value = true
  errMsg.value = ''
  try {
    const s = await offlineManageApi.getMyStation()
    station.value = s
    if (s) {
      brandStory.value = s.brandStory || ''
      photos.value = Array.isArray(s.photos) ? [...s.photos] : []
      featuredIds.value = Array.isArray(s.featuredTeacherIds) ? [...s.featuredTeacherIds] : []
    }
  } catch (e) {
    const msg = (e as Error)?.message
    errMsg.value = msg?.includes('未登录') ? '请先登录' : (msg || '加载失败')
    station.value = null
  } finally {
    loading.value = false
  }
}
onLoad(() => load())

// ── 环境图 ──
function addPhotos() {
  const remain = 9 - photos.value.length
  if (remain <= 0) return
  uni.chooseImage({
    count: remain,
    sizeType: ['compressed'],
    success: async (res) => {
      const raw = res.tempFilePaths
      const paths: string[] = Array.isArray(raw) ? raw : [raw as unknown as string]
      try {
        for (let i = 0; i < paths.length; i++) {
          uni.showLoading({ title: `上传中 ${i + 1}/${paths.length}`, mask: true })
          photos.value.push(await uploadImage(paths[i]))
        }
        uni.showToast({ title: `已添加 ${paths.length} 张`, icon: 'success' })
      } catch (err) {
        uni.showToast({ title: (err as Error)?.message || '上传失败', icon: 'none' })
      } finally {
        uni.hideLoading()
      }
    },
    fail: () => { /* 用户取消选图不打扰 */ },
  })
}
function removePhoto(index: number) {
  photos.value.splice(index, 1)
}
function previewPhoto(index: number) {
  uni.previewImage({ urls: photos.value, current: index })
}

// ── 保存（防重复提交·仅提交后端支持的字段） ──
const submitting = ref(false)
async function onSave() {
  if (submitting.value) return
  submitting.value = true
  try {
    await offlineManageApi.updateBrand({
      brandStory: brandStory.value,
      photos: photos.value,
      featuredTeacherIds: featuredIds.value,
    })
    uni.showToast({ title: '已保存', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '保存失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

/** 预览：以学员视角打开对外驿站详情页（未保存的改动不生效） */
function onPreview() {
  if (station.value) navigateTo(`/pkg-offline/station-detail/index?id=${station.value.id}`)
}
</script>

<style lang="scss" scoped>
.mb-page {
  height: 100vh;
  background: #F4F1EC;
  display: flex;
  flex-direction: column;
}

/* 自定义导航栏 */
.mb-nav {
  background: #F4F1EC;
  flex-shrink: 0;
}
.mb-nav-row {
  height: 46px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}
.mb-nav-btn {
  position: absolute;
  left: 10px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.mb-nav-title {
  font-size: 16px;
  font-weight: 600;
  color: #2C2C2C;
}
.mb-nav-preview {
  position: absolute;
  right: 18px;
  font-size: 13px;
  color: #C41E3A;
}

/* 三态 */
.mb-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 0 40px 80px;
}
.mb-state-text { font-size: 14px; color: #6E6E73; }
.spinner {
  width: 28px;
  height: 28px;
  border: 3px solid #EDE9E2;
  border-top-color: #C41E3A;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.mb-retry {
  margin-top: 4px;
  padding: 8px 22px;
  border: 1px solid #C41E3A;
  border-radius: 999px;
}
.mb-retry-text { font-size: 13px; color: #C41E3A; }

.mb-body { flex: 1; height: 0; min-height: 0; }
.mb-inner { padding: 10px 20px 100px; }

/* 卡片 */
.mb-card {
  background: #FFFFFF;
  border-radius: 18px;
  padding: 16px;
  margin-bottom: 14px;
  box-shadow: 0 2px 10px rgba(60, 40, 20, 0.05);
}
.mb-sec {
  display: block;
  font-size: 15px;
  font-weight: 700;
  color: #2C2C2C;
  margin-bottom: 12px;
}
.mb-sec-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.mb-sec-inline { margin-bottom: 0; }
.mb-tip-inline { font-size: 11px; color: #999999; }

/* 只读信息行 */
.mb-frow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 0;
  border-bottom: 1px solid #EDE9E2;
}
.mb-frow-last { border-bottom: none; padding-bottom: 0; }
.mb-frow-lb { font-size: 13.5px; color: #6E6E73; flex-shrink: 0; }
.mb-frow-vl {
  font-size: 13.5px;
  color: #2C2C2C;
  font-weight: 500;
  text-align: right;
  flex: 1;
  margin-left: 16px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.mb-frow-vl-box { flex: 1; display: flex; justify-content: flex-end; }
.mb-logo {
  width: 38px;
  height: 38px;
  border-radius: 8px;
  overflow: hidden;
}
.mb-logo-ph {
  background: linear-gradient(135deg, #efe9e0, #e4ddd0);
  display: flex;
  align-items: center;
  justify-content: center;
}
.mb-logo-txt { font-size: 9px; color: #b8ad9b; }

/* 环境图 16:9 */
.mb-photos {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.mb-photo {
  position: relative;
  width: calc((100% - 16px) / 3);
  height: 0;
  padding-top: calc((100% - 16px) / 3 * 0.5625);
  border-radius: 10px;
  overflow: hidden;
  background: linear-gradient(135deg, #efe9e0, #e4ddd0);
}
.mb-photo-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
.mb-photo-cover {
  position: absolute;
  top: 5px;
  left: 5px;
  background: #C41E3A;
  border-radius: 5px;
  padding: 1px 6px;
}
.mb-photo-cover-txt { font-size: 9px; color: #fff; }
.mb-photo-del {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 20px;
  height: 20px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
}
.mb-photo-add {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: none;
  border: 1.5px dashed #d6cdbd;
}
.mb-photo-add-txt {
  position: absolute;
  top: calc(50% - 4px);
  font-size: 10px;
  color: #b8ad9b;
}
.mb-photo-add-size {
  position: absolute;
  top: calc(50% + 10px);
  font-size: 9px;
  color: #c5bba9;
}
.mb-tip {
  display: block;
  font-size: 11px;
  color: #999999;
  margin-top: 10px;
  line-height: 1.6;
}

/* 驿站介绍输入 */
.mb-story-input {
  width: 100%;
  min-height: 92px;
  font-size: 13px;
  color: #2C2C2C;
  line-height: 1.7;
  background: #F4F1EC;
  border: 1.5px solid #EDE9E2;
  border-radius: 12px;
  padding: 12px 14px;
  box-sizing: border-box;
}
.mb-count {
  display: block;
  text-align: right;
  font-size: 11px;
  color: #999999;
  margin-top: 8px;
}

.mb-note {
  display: block;
  font-size: 11px;
  color: #999999;
  line-height: 1.8;
  padding: 0 4px;
}
.mb-safe { height: 20px; }

/* 底部保存 */
.mb-footer {
  flex-shrink: 0;
  background: #FFFFFF;
  border-top: 1px solid #EDE9E2;
  padding: 12px 20px;
  padding-bottom: calc(12px + env(safe-area-inset-bottom));
}
.mb-save {
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #C41E3A;
  border-radius: 999px;
}
.mb-save.disabled { opacity: 0.6; }
.mb-save-txt {
  font-size: 15px;
  font-weight: 700;
  color: #fff;
}
</style>
