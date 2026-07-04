<template>
  <view class="mb-page">
    <!-- 顶部导航 -->
    <view class="mb-header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="mb-nav">
        <view class="mb-icon-btn" @tap="goBack">
          <app-icon name="chevron-left" :size="22" color="#1a1a1a" />
        </view>
        <text class="mb-nav-title">品牌主页</text>
        <view class="mb-icon-btn" @tap="onPreview">
          <app-icon name="eye" :size="20" color="#9a2e25" />
        </view>
      </view>
    </view>

    <!-- 加载/错误态 -->
    <view v-if="loading" class="mb-state">
      <view class="spinner" />
      <text class="mb-state-text">加载中…</text>
    </view>
    <view v-else-if="!station" class="mb-state">
      <app-icon name="store" :size="44" color="#d1d5db" />
      <text class="mb-state-text">{{ errMsg || '您还不是驿站运营者' }}</text>
      <view class="retry-btn" @tap="load"><text class="retry-text">重试</text></view>
    </view>

    <template v-else>
      <scroll-view scroll-y class="mb-body">
        <!-- 驿站故事 -->
        <view class="mb-card">
          <view class="mb-card-head">
            <text class="mb-card-title">驿站故事</text>
            <text class="mb-card-count">{{ brandStory.length }}/3000</text>
          </view>
          <textarea
            v-model="brandStory"
            class="mb-story-input"
            placeholder="讲讲驿站的创办初心、传承脉络与特色……好故事是最好的招生文案"
            :maxlength="3000"
            auto-height
          />
        </view>

        <!-- 品牌相册（环境照片墙） -->
        <view class="mb-card">
          <view class="mb-card-head">
            <text class="mb-card-title">品牌相册</text>
            <text class="mb-card-count">{{ photos.length }}/30</text>
          </view>
          <text class="mb-card-tip">环境照片墙：教室、茶室、藏书阁……展示驿站氛围（首图为主页头图）</text>
          <view class="mb-photos">
            <view v-for="(p, i) in photos" :key="p + i" class="mb-photo">
              <image lazy-load :src="p" class="mb-photo-img" mode="aspectFill" @tap="previewPhoto(i)" />
              <view class="mb-photo-del" @tap.stop="removePhoto(i)">
                <app-icon name="x" :size="12" color="#fff" />
              </view>
            </view>
            <view v-if="photos.length < 30" class="mb-photo mb-photo-add" @tap="addPhotos">
              <app-icon name="plus" :size="24" color="#b8b2a7" />
            </view>
          </view>
        </view>

        <!-- 讲师阵容（从本驿站在岗讲师中挑选·点击顺序即展示顺序） -->
        <view class="mb-card">
          <view class="mb-card-head">
            <text class="mb-card-title">讲师阵容</text>
            <text class="mb-card-count">{{ featuredIds.length }}/12</text>
          </view>
          <text class="mb-card-tip">从驿站讲师中挑选主页展示的阵容，点选顺序即展示顺序；不选则默认展示全部在岗讲师</text>
          <view v-if="teachers.length === 0" class="mb-teachers-empty">
            <text class="mb-teachers-empty-text">暂无驿站讲师，可先到「讲师预约」引入研究院签约讲师</text>
          </view>
          <view v-else class="mb-teachers">
            <view
              v-for="t in teachers"
              :key="t.id"
              class="mb-teacher"
              :class="{ selected: featuredOrder(t.id) > 0 }"
              @tap="toggleTeacher(t.id)"
            >
              <view v-if="featuredOrder(t.id) > 0" class="mb-teacher-order"><text class="mb-teacher-order-txt">{{ featuredOrder(t.id) }}</text></view>
              <image lazy-load v-if="t.avatar" :src="t.avatar" class="mb-teacher-avatar" mode="aspectFill" />
              <view v-else class="mb-teacher-avatar mb-teacher-avatar-ph"><text class="mb-teacher-avatar-txt">{{ (t.name || '师')[0] }}</text></view>
              <text class="mb-teacher-name">{{ t.name }}</text>
              <text v-if="t.sourceUserId" class="mb-teacher-signed">签约</text>
            </view>
          </view>
        </view>

        <view class="mb-safe" />
      </scroll-view>

      <!-- 保存 -->
      <view class="mb-footer">
        <view class="mb-save-btn" :class="{ disabled: submitting }" @tap="onSave">
          <text class="mb-save-text">{{ submitting ? '保存中…' : '保存品牌资料' }}</text>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
/**
 * 驿站品牌主页编辑（驿-P1·B 端驿站长）
 * 数据：GET /offline/stations/my 回显（brandStory/photos/featuredTeacherIds 已随全行返回）
 *      + GET /offline/stations/:id/teachers 讲师候选；PUT /offline/stations/my/brand 保存。
 * 相册：复用 uni.chooseImage 多选 + utils/request.uploadImage 逐张上传（与 manage-events 回顾照片同范式）。
 * 讲师阵容：点选顺序即展示顺序（角标数字），后端会二次过滤只收本驿站在岗讲师。
 */
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo } from '@/utils/router'
import { uploadImage } from '@/utils/request'
import { offlineManageApi, type MyStation, type StationTeacherLite } from '@/lib/offline-data'

const statusBarHeight = ref(0)
try {
  const info = uni.getSystemInfoSync()
  statusBarHeight.value = info.statusBarHeight || 0
} catch {}

const loading = ref(true)
const errMsg = ref('')
const station = ref<MyStation | null>(null)
const teachers = ref<StationTeacherLite[]>([])

// 表单态（load 时从 station 回显）
const brandStory = ref('')
const photos = ref<string[]>([])
const featuredIds = ref<string[]>([])

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
      // 讲师候选：失败置空态不拖垮编辑页（阵容区显示空态引导）
      teachers.value = await offlineManageApi.getStationTeachers(s.id).catch(() => [])
      // 清掉已不在岗的历史挑选（诚实同步）
      const alive = new Set(teachers.value.map((t) => t.id))
      featuredIds.value = featuredIds.value.filter((tid) => alive.has(tid))
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

// ── 相册 ──
function addPhotos() {
  const remain = 30 - photos.value.length
  if (remain <= 0) return
  uni.chooseImage({
    count: Math.min(remain, 9),
    sizeType: ['compressed'],
    success: async (res) => {
      const paths: string[] = Array.isArray(res.tempFilePaths) ? res.tempFilePaths : [res.tempFilePaths as unknown as string]
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

// ── 讲师阵容（点选顺序即展示顺序） ──
function featuredOrder(id: string): number {
  return featuredIds.value.indexOf(id) + 1
}
function toggleTeacher(id: string) {
  const idx = featuredIds.value.indexOf(id)
  if (idx >= 0) featuredIds.value.splice(idx, 1)
  else if (featuredIds.value.length < 12) featuredIds.value.push(id)
  else uni.showToast({ title: '最多展示 12 位讲师', icon: 'none' })
}

// ── 保存（防重复提交） ──
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

/** 预览：直接进公开品牌主页（所见即所得，未保存的改动不生效） */
function onPreview() {
  if (station.value) navigateTo(`/pkg-offline/station-home/index?id=${station.value.id}`)
}
</script>

<style scoped>
.mb-page { min-height: 100vh; background: #f5f3ef; display: flex; flex-direction: column; }
.mb-header { position: sticky; top: 0; z-index: 50; background: rgba(255,255,255,0.92); backdrop-filter: blur(8px); border-bottom: 1px solid #ededed; }
.mb-nav { display: flex; align-items: center; justify-content: space-between; height: 48px; padding: 0 8px; }
.mb-icon-btn { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; }
.mb-nav-title { flex: 1; text-align: center; font-size: 16px; font-weight: 600; color: #1a1a1a; }
.mb-body { flex: 1; }

.mb-state { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding-top: 120px; }
.mb-state-text { font-size: 13px; color: #9ca3af; }
.spinner { width: 28px; height: 28px; border: 3px solid #f0f0f0; border-top-color: #9a2e25; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.retry-btn { margin-top: 4px; padding: 6px 20px; border: 1px solid #9a2e25; border-radius: 999px; }
.retry-text { font-size: 13px; color: #9a2e25; }

.mb-card { background: #fff; border-radius: 12px; padding: 16px; margin: 12px 12px 0; }
.mb-card-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.mb-card-title { font-size: 15px; font-weight: 600; color: #1a1a1a; }
.mb-card-count { font-size: 12px; color: #b8b2a7; }
.mb-card-tip { display: block; font-size: 12px; color: #9ca3af; line-height: 1.5; margin-bottom: 12px; }

.mb-story-input { width: 100%; min-height: 160px; font-size: 14px; color: #1a1a1a; line-height: 1.7; background: #faf8f4; border-radius: 8px; padding: 12px; box-sizing: border-box; }

.mb-photos { display: flex; flex-wrap: wrap; gap: 8px; }
.mb-photo { position: relative; width: calc((100% - 16px) / 3); aspect-ratio: 1; border-radius: 8px; overflow: hidden; background: #f0ebe2; }
.mb-photo-img { width: 100%; height: 100%; }
.mb-photo-del { position: absolute; top: 4px; right: 4px; width: 20px; height: 20px; border-radius: 999px; background: rgba(0,0,0,0.55); display: flex; align-items: center; justify-content: center; }
.mb-photo-add { display: flex; align-items: center; justify-content: center; border: 1px dashed #d8d2c6; background: #faf8f4; }

.mb-teachers-empty { padding: 20px 0; display: flex; justify-content: center; }
.mb-teachers-empty-text { font-size: 12px; color: #9ca3af; text-align: center; line-height: 1.6; }
.mb-teachers { display: flex; flex-wrap: wrap; gap: 10px; }
.mb-teacher { position: relative; width: calc((100% - 30px) / 4); display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 10px 4px; border-radius: 10px; border: 1px solid #efece5; background: #faf8f4; }
.mb-teacher.selected { border-color: #9a2e25; background: rgba(154,46,37,0.05); }
.mb-teacher-order { position: absolute; top: -6px; right: -6px; width: 20px; height: 20px; border-radius: 999px; background: #9a2e25; display: flex; align-items: center; justify-content: center; }
.mb-teacher-order-txt { font-size: 11px; color: #fff; font-weight: 600; }
.mb-teacher-avatar { width: 44px; height: 44px; border-radius: 999px; }
.mb-teacher-avatar-ph { background: #e8ded0; display: flex; align-items: center; justify-content: center; }
.mb-teacher-avatar-txt { font-size: 15px; color: #8a6d3b; }
.mb-teacher-name { max-width: 100%; font-size: 12px; color: #1a1a1a; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mb-teacher-signed { font-size: 10px; color: #7a5f33; background: linear-gradient(135deg, #f3e7cf, #e6d3a8); padding: 0 8px; border-radius: 999px; }

.mb-safe { height: 88px; }
.mb-footer { position: fixed; bottom: 0; left: 0; right: 0; padding: 12px 16px; padding-bottom: calc(12px + env(safe-area-inset-bottom)); background: #fff; border-top: 1px solid #ededed; }
.mb-save-btn { height: 44px; display: flex; align-items: center; justify-content: center; background: #9a2e25; border-radius: 8px; }
.mb-save-btn.disabled { opacity: 0.6; }
.mb-save-text { font-size: 15px; font-weight: 600; color: #fff; }
</style>
