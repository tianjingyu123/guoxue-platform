<script setup lang="ts">
/**
 * 咨询问答（从原型 app/circles/[id]/consult/ask/page.tsx 高保真迁移）
 * 提出问题按钮 + 新问题表单(展开) + 热门问题列表。点问题→详情(未迁移,toast兜底)。
 */
import { ref } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, toastComingSoon } from '@/utils/router'
import { useSubmitLock } from '@/composables/use-submit-lock'

interface QItem {
  id: string; title: string; content: string; asker: string; avatar: string
  views: number; likes: number; answers: number; status: 'answered' | 'unanswered'; time: string
}

const questions = ref<QItem[]>([
  { id: '1', title: '如何通过八字看一个人的财运？', content: '我想了解如何从八字命盘中看出一个人的财运好坏，有什么关键要素吗？', asker: '张女士', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=40', views: 1250, likes: 85, answers: 12, status: 'answered', time: '2024-01-20 14:30' },
  { id: '2', title: '紫微斗数和八字哪个准确率更高？', content: '想对比一下两种算命方法的准确率，求推荐。', asker: '李先生', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40', views: 850, likes: 62, answers: 8, status: 'answered', time: '2024-01-20 10:15' },
  { id: '3', title: '流年大运是如何计算的？', content: '请问流年大运的计算方法，以及如何才能准确的判断出一个人的吉凶祸福。', asker: '王女士', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=40', views: 620, likes: 45, answers: 5, status: 'unanswered', time: '2024-01-20 09:45' },
])

const showNew = ref(false)
const newTitle = ref('')
const newContent = ref('')
const { submitting, withLock } = useSubmitLock()

function postQuestion() {
  if ((!newTitle.value.trim() || !newContent.value.trim()) || submitting.value) return
  withLock(async () => {
    await new Promise((r) => setTimeout(r, 500))
    showNew.value = false
    newTitle.value = ''
    newContent.value = ''
    uni.showToast({ title: '问题已提交', icon: 'success' })
  })
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
              {{ submitting ? '发送中...' : '发送' }}
            </text>
          </view>
        </view>
      </view>

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
              {{ q.asker }} • {{ q.time }}
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
</style>
