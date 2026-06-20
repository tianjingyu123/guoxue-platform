<script setup lang="ts">
/**
 * 咨询问答 — 三态：加载骨架 → 错误重试 → 热门问题列表
 * 展开提问表单 + API 提交
 */
import { ref, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import ErrorState from '@/components/common/error-state.vue'
import { goBack, toastComingSoon } from '@/utils/router'
import { circleDetailApi, type QuestionItem } from '@/lib/circle-detail-data'

const loading = ref(true)
const error = ref('')
const questions = ref<QuestionItem[]>([])
const circleId = ref('1')

const showNew = ref(false)
const newTitle = ref('')
const newContent = ref('')
const submitting = ref(false)

onMounted(() => {
  const pages = getCurrentPages()
  const cur = pages[pages.length - 1]
  const q = (cur as any).$page?.options || {}
  if (q.circleId) circleId.value = q.circleId
  loadData()
})

async function loadData() {
  loading.value = true
  error.value = ''
  try {
    const res: any = await circleDetailApi.listQuestions(circleId.value)
    questions.value = res.data || []
  } catch (e: any) {
    error.value = e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

async function postQuestion() {
  if (!newTitle.value.trim() || !newContent.value.trim() || submitting.value) return
  submitting.value = true
  try {
    await circleDetailApi.createQuestion(circleId.value, { title: newTitle.value.trim(), content: newContent.value.trim() })
    showNew.value = false
    newTitle.value = ''
    newContent.value = ''
    uni.showToast({ title: '问题已提交', icon: 'success' })
    loadData()
  } catch (e: any) {
    uni.showToast({ title: e?.message || '提交失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <view class="ca-page">
    <view class="ca-nav">
      <view
        class="ca-nav-btn"
        @tap="goBack"
      >
        <app-icon
          name="arrow-left"
          :size="36"
          color="#2C2C2C"
        />
      </view>
      <text class="ca-nav-title">
        咨询问答
      </text>
      <view class="ca-nav-btn" />
    </view>

    <view class="ca-body">
      <view
        class="ca-ask-btn"
        @tap="showNew = true"
      >
        <app-icon
          name="message-square"
          :size="28"
          color="#ffffff"
        />
        <text class="ca-ask-btn-t">
          提出问题
        </text>
      </view>

      <view
        v-if="showNew"
        class="ca-form"
      >
        <input
          v-model="newTitle"
          class="ca-input"
          placeholder="问题标题"
          placeholder-class="ca-ph"
        >
        <textarea
          v-model="newContent"
          class="ca-textarea"
          placeholder="详细描述您的问题..."
          placeholder-class="ca-ph"
        />
        <view class="ca-form-actions">
          <view
            class="ca-form-cancel"
            @tap="showNew = false"
          >
            <text class="ca-form-cancel-t">
              取消
            </text>
          </view>
          <view
            class="ca-form-send"
            :class="{ 'is-disabled': !newTitle.trim() || !newContent.trim() || submitting }"
            @tap="postQuestion"
          >
            <app-icon
              name="send"
              :size="26"
              color="#ffffff"
            />
            <text class="ca-form-send-t">
              {{ submitting ? '提交中...' : '发送' }}
            </text>
          </view>
        </view>
      </view>

      <!-- 骨架 -->
      <view
        v-if="loading"
        class="ca-skel"
      >
        <view
          v-for="i in 3"
          :key="i"
          class="ca-skel-card"
        >
          <view class="ca-skel-top">
            <view class="ca-skel-avatar" /><view class="ca-skel-lines">
              <view class="ca-skel-line w80" /><view class="ca-skel-line w60" />
            </view>
          </view>
          <view class="ca-skel-meta">
            <view class="ca-skel-line w40" />
          </view>
        </view>
      </view>

      <!-- 错误 -->
      <error-state
        v-else-if="error"
        :message="error"
        @retry="loadData"
      />

      <template v-else>
        <text class="ca-section">
          热门问题
        </text>
        <view class="ca-list">
          <view
            v-for="q in questions"
            :key="q.id"
            class="ca-card"
            @tap="toastComingSoon"
          >
            <view class="ca-card-top">
              <image
                class="ca-avatar"
                :src="q.avatar"
                mode="aspectFill"
              />
              <view class="ca-card-info">
                <text class="ca-card-title">
                  {{ q.title }}
                </text>
                <text class="ca-card-desc">
                  {{ q.content }}
                </text>
              </view>
              <view
                v-if="q.status === 'unanswered'"
                class="ca-badge"
              >
                <text class="ca-badge-t">
                  待答
                </text>
              </view>
            </view>
            <view class="ca-card-meta">
              <text class="ca-meta-asker">
                {{ q.asker }} · {{ q.time }}
              </text>
              <view class="ca-meta-stats">
                <view class="ca-stat">
                  <app-icon
                    name="eye"
                    :size="22"
                    color="#999999"
                  /><text class="ca-stat-t">
                    {{ q.views }}
                  </text>
                </view>
                <view class="ca-stat">
                  <app-icon
                    name="thumbs-up"
                    :size="22"
                    color="#999999"
                  /><text class="ca-stat-t">
                    {{ q.likes }}
                  </text>
                </view>
                <view class="ca-stat">
                  <app-icon
                    name="message-square"
                    :size="22"
                    color="#999999"
                  /><text class="ca-stat-t">
                    {{ q.answers }}
                  </text>
                </view>
              </view>
            </view>
          </view>
        </view>
      </template>
    </view>
  </view>
</template>

<style scoped lang="scss">
.ca-page { min-height: 100vh; background: #F5F1E8; }
.ca-nav { position: sticky; top: 0; z-index: 10; display: flex; align-items: center; justify-content: space-between; padding: 20rpx 24rpx; background: #F5F1E8; border-bottom: 1rpx solid #E8E0D0; }
.ca-nav-btn { width: 48rpx; height: 48rpx; display: flex; align-items: center; justify-content: center; }
.ca-nav-title { font-size: 34rpx; font-weight: 600; color: #2C2C2C; }
.ca-body { padding: 24rpx; padding-bottom: 48rpx; }
.ca-ask-btn { display: flex; align-items: center; justify-content: center; gap: 12rpx; height: 84rpx; border-radius: 16rpx; background: #C41E3A; }
.ca-ask-btn-t { font-size: 28rpx; color: #fff; font-weight: 600; }
.ca-form { margin-top: 24rpx; padding: 24rpx; background: rgba(196,30,58,0.05); border: 1rpx solid rgba(196,30,58,0.2); border-radius: 20rpx; }
.ca-input { width: 100%; box-sizing: border-box; padding: 18rpx 20rpx; border: 1rpx solid #E8E0D0; border-radius: 12rpx; background: #fff; font-size: 28rpx; color: #2C2C2C; }
.ca-textarea { width: 100%; box-sizing: border-box; height: 160rpx; margin-top: 16rpx; padding: 18rpx 20rpx; border: 1rpx solid #E8E0D0; border-radius: 12rpx; background: #fff; font-size: 28rpx; color: #2C2C2C; }
.ca-ph { color: #b5aea3; }
.ca-form-actions { display: flex; gap: 16rpx; margin-top: 16rpx; }
.ca-form-cancel { flex: 1; height: 76rpx; border: 1rpx solid #E8E0D0; border-radius: 12rpx; background: #fff; display: flex; align-items: center; justify-content: center; }
.ca-form-cancel-t { font-size: 28rpx; color: #2C2C2C; }
.ca-form-send { flex: 1; height: 76rpx; border-radius: 12rpx; background: #C41E3A; display: flex; align-items: center; justify-content: center; gap: 8rpx; }
.ca-form-send.is-disabled { opacity: 0.5; }
.ca-form-send-t { font-size: 28rpx; color: #fff; font-weight: 500; }
.ca-section { display: block; font-size: 26rpx; font-weight: 600; color: #2C2C2C; margin: 28rpx 0 16rpx; }
.ca-list { display: flex; flex-direction: column; gap: 16rpx; }
.ca-card { padding: 24rpx; border-radius: 20rpx; border: 1rpx solid #E8E0D0; background: #fff; }
.ca-card-top { display: flex; align-items: flex-start; gap: 16rpx; margin-bottom: 20rpx; }
.ca-avatar { width: 56rpx; height: 56rpx; border-radius: 50%; flex-shrink: 0; }
.ca-card-info { flex: 1; min-width: 0; }
.ca-card-title { display: block; font-size: 28rpx; font-weight: 600; color: #2C2C2C; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ca-card-desc { display: block; font-size: 24rpx; color: #999; margin-top: 6rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ca-badge { background: #FEF0E6; border-radius: 999rpx; padding: 4rpx 14rpx; flex-shrink: 0; }
.ca-badge-t { font-size: 22rpx; color: #C2660A; }
.ca-card-meta { display: flex; align-items: center; justify-content: space-between; }
.ca-meta-asker { font-size: 22rpx; color: #999; }
.ca-meta-stats { display: flex; align-items: center; gap: 20rpx; }
.ca-stat { display: flex; align-items: center; gap: 6rpx; }
.ca-stat-t { font-size: 22rpx; color: #999; }
/* 骨架 */
.ca-skel { display: flex; flex-direction: column; gap: 16rpx; }
.ca-skel-card { padding: 24rpx; border-radius: 20rpx; background: #fff; }
.ca-skel-top { display: flex; gap: 16rpx; margin-bottom: 20rpx; }
.ca-skel-avatar { width: 56rpx; height: 56rpx; border-radius: 50%; background: #E8E0D0; flex-shrink: 0; }
.ca-skel-lines { flex: 1; display: flex; flex-direction: column; gap: 12rpx; padding-top: 8rpx; }
.ca-skel-line { height: 24rpx; background: #E8E0D0; border-radius: 8rpx; }
.ca-skel-line.w80 { width: 80%; }
.ca-skel-line.w60 { width: 60%; }
.ca-skel-line.w40 { width: 40%; }
.ca-skel-meta { padding-left: 72rpx; }
</style>
